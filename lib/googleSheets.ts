const SETTINGS_SHEET_NAME = ".trackwell-settings";
const SETTINGS_RANGE = `${SETTINGS_SHEET_NAME}!A1`;

/**
 * Reads the settings JSON from the hidden tab in the user's Google Sheet.
 */
export async function getSettingsFromSheet(spreadsheetId: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SETTINGS_RANGE)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch settings from sheet.");
    }
    const data = await response.json();
    return data.values?.[0]?.[0] || null;
  } catch (error) {
    console.error("Error getting settings from sheet:", error);
    return null;
  }
}

/**
 * Writes the settings JSON to the hidden tab in the user's Google Sheet.
 * It will create the hidden tab if it doesn't exist.
 */
export async function saveSettingsToSheet(settingsJson: string, spreadsheetId: string, accessToken: string): Promise<boolean> {
  try {
    // First, try to update the value. This is faster if the sheet already exists.
    const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(SETTINGS_RANGE)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[settingsJson]],
        }),
      }
    );

    // If the update fails (e.g., the sheet doesn't exist), create the sheet and then update.
    if (updateResponse.status === 400) {
      await _createHiddenSheet(spreadsheetId, accessToken);
      // Retry the update after creating the sheet
      return await saveSettingsToSheet(settingsJson, spreadsheetId, accessToken);
    }

    if (!updateResponse.ok) {
    const errorBody = await updateResponse.json();
    console.error("Google Sheets API error:", errorBody);
    throw new Error("Failed to update settings in sheet.");
    }

    return true;
  } catch (error) {
    console.error("Error saving settings to sheet:", error);
    return false;
  }
}

/**
 * Helper function to create the hidden settings sheet.
 */
async function _createHiddenSheet(spreadsheetId: string, accessToken: string) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: SETTINGS_SHEET_NAME,
                hidden: true,
              },
            },
          },
        ],
      }),
    }
  );
}