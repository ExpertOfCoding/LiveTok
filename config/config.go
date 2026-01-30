package config

import (
	"encoding/json"
	"os"
)

type EventConfig struct {
	GiftName string   `json:"gift_name"`
	GiftID   int      `json:"gift_id"`
	ActionID []string `json:"action_id"`
	Enabled  bool     `json:"enabled"`
	MinCoin  int      `json:"min_coin"`
	MaxCoin  int      `json:"max_coin"`
}

type TTSConfig struct {
	Enabled bool   `json:"enabled"`
	Type    string `json:"type"`
	Voice   struct {
		Type string `json:"type"`
	} `json:"voice"`
}

type ActionConfig struct {
	Screen    string   `json:"screen"`
	Commands  []string `json:"commands"`
	PlayMedia struct {
		Type        string  `json:"type"`
		MediaPath   string  `json:"media_path"`
		MaxDuration string  `json:"max_duration"`
		Volume      float64 `json:"volume"`
	} `json:"play_media"`
	SkipOnNextAction bool   `json:"skip_on_next_action"`
	ShowUserInfo     bool   `json:"show_user_info"`
	DisplayText      string `json:"display_text"`
}

type DataConfig struct {
	Key                 string                  `json:"key"`
	ServerURL           string                  `json:"server_url"`
	Port                int                     `json:"port"`
	TiktokUsername      string                  `json:"tiktok_username"`
	Volume              float64                 `json:"volume"`
	MaxCharsTTS         int                     `json:"max_chars_tts"`
	MaxCommentQueLength int                     `json:"max_comment_que_length"`
	MaxMediaQueLength   int                     `json:"max_media_que_length"`
	Events              EventsConfig            `json:"events"`
	Actions             map[string]ActionConfig `json:"actions"`
}

type EventsConfig struct {
	SpecifiedGift []EventConfig `json:"specifiedGift"`
	CoinCount     []EventConfig `json:"coinCount"`
	TextToSpeech  TTSConfig     `json:"textToSpeech"`
	Follow        EventConfig   `json:"follow"`
}

func LoadConfig() (*DataConfig, error) {
	file, err := os.ReadFile("data.json")
	if err != nil {
		return nil, err
	}

	var config DataConfig
	err = json.Unmarshal(file, &config)
	if err != nil {
		return nil, err
	}

	return &config, nil
}
