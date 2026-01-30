package main

import (
	"LiveTok/config"
	minecraftCommandManager "LiveTok/minecraft"
	tiktokconnector "LiveTok/tiktokConnection"
	"fmt"
	"log"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

func main() {
	Data, err := config.LoadConfig()
	if err != nil {
		fmt.Println("Error loading config:", err)
		return
	}
	app := fiber.New()
	minecraftCommandManager.SetupRoutes(app)
	tiktokconnector.SetupRoutes(app)
	fmt.Println("Server starting on port " + strconv.Itoa(Data.Port))
	log.Fatal(app.Listen(":" + strconv.Itoa(Data.Port)))
}
