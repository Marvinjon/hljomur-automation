// @target illustrator
// Script to disable the security warning dialog when running scripts in Illustrator

// This script sets a preference to disable the security warning
app.preferences.setBooleanPreference("ShowExternalJSXWarning", false);

alert("Script security warnings have been disabled. You will not receive warnings when running scripts anymore."); 