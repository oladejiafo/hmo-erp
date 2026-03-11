<?php

namespace App\Helpers;

use App\Models\SystemSetting;

class SettingsHelper
{
    public static function get($key, $default = null)
    {
        return SystemSetting::get($key, $default);
    }
}