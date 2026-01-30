package tiktokconnector

import (
	config "LiveTok/config"
	minecraftCommandManager "LiveTok/minecraft"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/steampoweredtaco/gotiktoklive"
)

type StartRequestBody struct {
	Username string `json:"username"`
}

type DataType struct {
	Type             string  `json:"type"`
	MediaPath        string  `json:"media_path"`
	MaxDuration      string  `json:"max_duration"`
	Volume           float64 `json:"volume"`
	Screen           string  `json:"screen"`
	ActionId         string  `json:"action_id"`
	SkipOnNextAction bool    `json:"skip_on_next_action"`
	ShowUserInfo     bool    `json:"show_user_info"`
	DisplayText      string  `json:"display_text"`
}

var (
	Data           *config.DataConfig
	commentQueue   []string
	dataQueue      []DataType
	queueMutex     sync.Mutex
	dataQueueMutex sync.Mutex
	isLoopActive   bool
	activeScreens  map[string]time.Time
	screensMutex   sync.Mutex
)

func SetupRoutes(app *fiber.App) {
	var live *gotiktoklive.Live

	tiktok, err := gotiktoklive.NewTikTok()
	if err != nil {
		log.Println("Error creating TikTok instance:", err)
		return
	}

	// CORS Middleware
	app.Use(cors.New())

	// Init active screens
	activeScreens = make(map[string]time.Time)

	// Serve media files
	app.Get("/media/*", static.New("./public/media"))

	// Create media directory if not exists
	os.MkdirAll("./public/media", 0755)

	// Kuyruk döngüsünü sadece bir kez başlat
	if !isLoopActive {
		go readCommentsQue()
		isLoopActive = true
	}
	app.Get("/data/:screen", func(c fiber.Ctx) error {
		screen := c.Params("screen")

		// Mark screen as active (Heartbeat)
		screensMutex.Lock()
		activeScreens[screen] = time.Now()
		screensMutex.Unlock()

		var screenDatas []DataType
		var otherDatas []DataType
		for _, data := range dataQueue {
			if data.Screen == screen {
				screenDatas = append(screenDatas, data)
			} else {
				otherDatas = append(otherDatas, data)
			}
		}
		dataQueueMutex.Lock()
		defer dataQueueMutex.Unlock()
		if len(screenDatas) > 0 {
			temp := screenDatas[0]
			screenDatas = screenDatas[1:]
			dataQueue = append(otherDatas, screenDatas...)
			fmt.Println("Data sent to screen " + screen + " : " + temp.MediaPath)
			fmt.Println("Data queue length : " + strconv.Itoa(len(dataQueue)))
			return c.JSON(temp)
		}
		return c.JSON(fiber.Map{"error": "No data in queue"})
	})

	app.Get("/updateData", func(c fiber.Ctx) error {
		var err error
		Data, err = config.LoadConfig()
		if err != nil {
			fmt.Println("Config error:", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to load config"})
		}
		return c.JSON(fiber.Map{"status": "success"})
	})

	app.Get("/config", func(c fiber.Ctx) error {
		data, err := os.ReadFile("data.json")
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		var cfg interface{}
		json.Unmarshal(data, &cfg)
		return c.JSON(cfg)
	})

	app.Post("/config", func(c fiber.Ctx) error {
		var cfg interface{}
		if err := c.Bind().Body(&cfg); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
		}
		newData, _ := json.MarshalIndent(cfg, "", "    ")
		err := os.WriteFile("data.json", newData, 0644)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		// Reload config in memory
		Data, _ = config.LoadConfig()
		return c.JSON(fiber.Map{"status": "success"})
	})

	app.Post("/upload", func(c fiber.Ctx) error {
		file, err := c.FormFile("file")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "No file uploaded"})
		}

		dest := filepath.Join("./public/media", file.Filename)
		if err := c.SaveFile(file, dest); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save file"})
		}

		return c.JSON(fiber.Map{
			"status": "success",
			"url":    fmt.Sprintf("http://localhost:3000/media/%s", file.Filename),
			"path":   dest,
		})
	})

	app.Post("/start", func(c fiber.Ctx) error {
		var body StartRequestBody
		if err := c.Bind().Body(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		if body.Username == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Username is required"})
		}

		if live != nil {
			live.Close()
		}

		var trackErr error
		live, trackErr = tiktok.TrackUser(body.Username)
		if trackErr != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to track user: " + trackErr.Error()})
		}

		go listen(live)
		return c.JSON(fiber.Map{"status": "success", "username": body.Username})
	})
}

func speak(text string) {
	if text == "" {
		return
	}

	// İstek gövdesini oluştur
	values := map[string]interface{}{
		"text":   text,
		"volume": Data.Volume,
	}
	jsonData, _ := json.Marshal(values)

	// Python API'ye POST isteği gönder
	resp, err := http.Post("http://127.0.0.1:8000/speak", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("TTS Hatası:", err)
		return
	}
	defer resp.Body.Close()
}

func readCommentsQue() {
	for {
		var currentComment string
		queueMutex.Lock()
		if len(commentQueue) > 0 {
			currentComment = commentQueue[0]
			commentQueue = commentQueue[1:]
		}
		queueMutex.Unlock()

		if currentComment != "" {
			fmt.Println("Speaking comment : " + currentComment)
			speak(currentComment)
		}
		time.Sleep(200 * time.Millisecond)
	}
}

func listen(live *gotiktoklive.Live) {
	var err error
	Data, err = config.LoadConfig()
	if err != nil {
		fmt.Println("Config error:", err)
		return
	}

	for event := range live.Events {
		switch e := event.(type) {
		case gotiktoklive.ChatEvent:
			if Data.Events.TextToSpeech.Enabled {
				if Data.Events.TextToSpeech.Type == "fanClub" {
					if isFan(&e) {
						queueMutex.Lock()

						if len(commentQueue) < Data.MaxCommentQueLength {
							fullText := fmt.Sprintf("%s dedi %s", e.Comment, e.User.Username)
							if len(fullText) > Data.MaxCharsTTS {
								fullText = fullText[:Data.MaxCharsTTS]
							}
							commentQueue = append(commentQueue, fullText)

						}
						queueMutex.Unlock()

					}
				}
			}
		case gotiktoklive.GiftEvent:
			found := false
			for _, gift := range Data.Events.SpecifiedGift {
				if gift.Enabled {
					if strings.EqualFold(gift.GiftName, e.Name) {
						for _, actionID := range gift.ActionID {
							action := Data.Actions[actionID]

							// Smart Queuing: Only queue if screen is active (heartbeat in last 10s)
							screensMutex.Lock()
							lastHeartbeat, isActive := activeScreens[action.Screen]
							screensMutex.Unlock()

							if !isActive || time.Since(lastHeartbeat) > 10*time.Second {
								fmt.Printf("Skipping queue for screen %s (Not Active)\n", action.Screen)
								continue
							}

							for _, command := range action.Commands {
								sendCommandErr := minecraftCommandManager.SendCommand(command)
								if sendCommandErr != nil {
									fmt.Println("Send command error:", sendCommandErr)
								}
							}

							dataQueueMutex.Lock()
							var screenDatas []DataType
							for _, data := range dataQueue {
								if data.Screen == Data.Actions[actionID].Screen {
									screenDatas = append(screenDatas, data)
								}
							}
							if len(screenDatas) < Data.MaxMediaQueLength {
								if Data.Actions[actionID].PlayMedia.MediaPath != "" {
									dataQueue = append(dataQueue, DataType{
										Type:             Data.Actions[actionID].PlayMedia.Type,
										MediaPath:        Data.Actions[actionID].PlayMedia.MediaPath,
										MaxDuration:      Data.Actions[actionID].PlayMedia.MaxDuration,
										Volume:           Data.Actions[actionID].PlayMedia.Volume,
										Screen:           Data.Actions[actionID].Screen,
										ActionId:         actionID,
										SkipOnNextAction: Data.Actions[actionID].SkipOnNextAction,
										ShowUserInfo:     Data.Actions[actionID].ShowUserInfo,
										DisplayText:      Data.Actions[actionID].DisplayText,
									})
								}

							}
							dataQueueMutex.Unlock()

						}
						fmt.Println("Gift received by " + e.User.Nickname + " :  " + e.Name + " and applied the command")
						found = true
					}
				}
			}
			if !found {
				for _, coinCount := range Data.Events.CoinCount {
					if coinCount.Enabled {
						if e.Diamonds >= coinCount.MinCoin && e.Diamonds <= coinCount.MaxCoin {
							for _, actionID := range coinCount.ActionID {
								action := Data.Actions[actionID]

								// Smart Queuing
								screensMutex.Lock()
								lastHeartbeat, isActive := activeScreens[action.Screen]
								screensMutex.Unlock()

								if !isActive || time.Since(lastHeartbeat) > 10*time.Second {
									fmt.Printf("Skipping queue for screen %s (Not Active)\n", action.Screen)
									continue
								}

								for _, command := range action.Commands {
									sendCommandErr := minecraftCommandManager.SendCommand(command)
									if sendCommandErr != nil {
										fmt.Println("Send command error:", sendCommandErr)
									}
								}
							}
							fmt.Println("Coin count received by " + e.User.Nickname + " :  " + strconv.Itoa(e.Diamonds) + " and applied the command")
						}
					}
				}
			}
		}
	}
}

func isFan(e *gotiktoklive.ChatEvent) bool {
	if e.User != nil && e.User.Badge != nil {
		for _, badge := range e.User.Badge.Badges {
			if strings.Contains(badge.Name, "fans_badge_icon_lv") && !strings.Contains(badge.Name, "_gray_") {
				return true
			}
		}
	}
	return false
}
