package minecraftCommandManager

import (
	"LiveTok/config"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v3"
)

type CommandRouteRequestBody struct {
	Command string `json:"command"`
}

// SendCommand sends a command to the Minecraft server via ServerTap REST API
func SendCommand(command string) error {
	conf, err := config.LoadConfig()
	if err != nil {
		return fmt.Errorf("config load error: %v", err)
	}

	// ServerTap executive endpoint
	serverTapURL := conf.ServerURL

	// Prepare form data
	formData := url.Values{}
	formData.Set("command", command)

	// Create request with form data in body
	req, err := http.NewRequest("POST", serverTapURL, strings.NewReader(formData.Encode()))
	if err != nil {
		fmt.Println("ServerTap Error Request:", err)
		return err
	}

	// Set required headers
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Set the security key from config
	req.Header.Set("Cookie", "x-servertap-key="+conf.Key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("ServerTap Error Response:", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		bodystring := string(bodyBytes)
		fmt.Println("ServerTap Error Response:", bodystring)
		return fmt.Errorf("server returned status: %d", resp.StatusCode)
	}

	return nil
}

func SetupRoutes(app *fiber.App) {
	app.Post("/command", func(c fiber.Ctx) error {
		var body CommandRouteRequestBody
		if err := c.Bind().Body(&body); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if body.Command == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Command is required"})
		}

		if err := SendCommand(body.Command); err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": fmt.Sprintf("Failed to send command: %v", err),
			})
		}

		return c.JSON(fiber.Map{
			"status":  "success",
			"message": "Command sent: " + body.Command,
		})
	})
}
