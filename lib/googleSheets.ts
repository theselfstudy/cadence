// ============================================
// Google Sheets API Helpers
// ============================================

import type { StoredEntry, UserSettings, SheetColumn } from '@/types';
import { PRODUCT_OPTIONS } from '@/lib/constants';

// Sheet names
const SETTINGS_SHEET_NAME = ".trackwell-settings";
const ENTRIES_SHEET_NAME = "TrackWell-Entries";

// Ranges
const SETTINGS_RANGE = `${SETTINGS_SHEET_NAME}!A1`;
const ENTRIES_HEADERS_RANGE = `'${ENTRIES_SHEET_NAME}'!1:1`;

// ============================================
// SETTINGS FUNCTIONS (existing)
// ============================================

/**
 * Reads the settings JSON from the hidden tab in the user's Google Sheet.
 */
export async function getSettingsFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<string | null> {
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
export async function saveSettingsToSheet(
  settingsJson: string,
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  try {
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

    if (updateResponse.status === 400) {
      await _createHiddenSheet(spreadsheetId, accessToken, SETTINGS_SHEET_NAME);
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
 * Helper function to create a hidden sheet.
 */
async function _createHiddenSheet(
  spreadsheetId: string,
  accessToken: string,
  sheetName: string
) {
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
                title: sheetName,
                hidden: true,
              },
            },
          },
        ],
      }),
    }
  );
}

/**
 * Checks if the settings sheet exists and has content.
 */
export async function checkForExistingSettings(
  spreadsheetId: string,
  accessToken: string
): Promise<string | null> {
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
      return null;
    }

    const data = await response.json();
    return data.values?.[0]?.[0] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Deletes the settings sheet from the user's Google Sheet.
 * Used when doing a full reset to remove all saved settings.
 */
export async function deleteSettingsSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  try {
    // First, get the sheet ID for the settings sheet
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to get spreadsheet info");
      return false;
    }

    const data = await response.json();
    const settingsSheet = data.sheets?.find(
      (sheet: { properties: { title: string } }) =>
        sheet.properties.title === SETTINGS_SHEET_NAME
    );

    if (!settingsSheet) {
      // Sheet doesn't exist, nothing to delete
      console.log("Settings sheet not found, nothing to delete");
      return true;
    }

    const sheetId = settingsSheet.properties.sheetId;

    // Delete the sheet
    const deleteResponse = await fetch(
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
              deleteSheet: {
                sheetId: sheetId,
              },
            },
          ],
        }),
      }
    );

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      console.error("Failed to delete settings sheet:", error);
      return false;
    }

    console.log("Settings sheet deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting settings sheet:", error);
    return false;
  }
}

// ============================================
// ENTRIES FUNCTIONS (new)
// ============================================

/**
 * Builds the canonical column order based on current user settings.
 * Order matches the entry form:
 * Date → Start Time → Notes → End Time  → Pain Scale → Stool → Cycle → Flow → Products → 
 * General Symptoms → Period Symptoms → Medicines
 */
export function buildCanonicalColumns(settings: UserSettings): SheetColumn[] {
  const columns: SheetColumn[] = [];

  // ─────────────────────────────────────────
  // SECTION 1: Metadata (always present)
  // ─────────────────────────────────────────
  columns.push({
    header: 'Date',
    section: 'metadata',
    getValue: (entry) => entry.date,
  });
  
  columns.push({
    header: 'Start Time',
    section: 'metadata',
    getValue: (entry) => entry.startTime,
  });
  
  columns.push({
    header: 'Pain Scale',
    section: 'metadata',
    getValue: (entry) => entry.painScale,
  });

  // ─────────────────────────────────────────
  // SECTION 8: Closing (always present)
  // ─────────────────────────────────────────
  
  columns.push({
    header: 'End Time',
    section: 'closing',
    getValue: (entry) => entry.endTime,
  });

  columns.push({
    header: 'Notes',
    section: 'closing',
    getValue: (entry) => entry.notes ?? '',
  });

  // ─────────────────────────────────────────
  // SECTION 2: Stool Tracking (Bristol Stool Scale)
  // ─────────────────────────────────────────
  if (settings.stoolTracking.enabled) {
    columns.push({
      header: 'Stool: Type',
      section: 'stool',
      getValue: (entry) => entry.stoolType ?? '',
    });
    
    columns.push({
      header: 'Stool: Feeling',
      section: 'stool',
      getValue: (entry) => entry.stoolFeeling ?? '',
    });
  }

  // ─────────────────────────────────────────
  // SECTION 3: Period/Cycle Tracking
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled) {
    // Cycle Phase (always show if period tracking enabled)
    columns.push({
      header: 'Cycle Phase',
      section: 'period',
      getValue: (entry) => entry.cyclePhase ?? '',
    });

    // Period flow (only if flow tracking enabled)
    if (settings.periodTracking.trackFlow) {
      columns.push({
        header: 'Period: Flow',
        section: 'period',
        getValue: (entry) => entry.periodFlow ?? '',
      });
    }
  }

  // ─────────────────────────────────────────
  // SECTION 4: Products
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled && settings.periodTracking.productTracking?.enabled) {
    const selectedProducts = settings.periodTracking.productTracking.selectedProducts ?? [];
    const customProductsMap = settings.periodTracking.productTracking.customProducts ?? {};
    
    for (const productType of selectedProducts) {
      // Find the product definition to check if it uses custom products
      const productDef = PRODUCT_OPTIONS.find(p => p.type === productType);
      
      if (productDef?.allowCustomProducts) {
        // Products with custom products (cup, disc, other):
        // Create a column for EACH custom product, not a generic column
        const customProducts = customProductsMap[productType] ?? [];
        
        for (const customProduct of customProducts) {
          const productLabel = productDef.label.toLowerCase();
          
          columns.push({
            header: `Product: ${customProduct.name} (${productLabel})`,
            section: 'products',
            getValue: (entry) => {
              const usage = entry.productUsage.find(
                p => p.productType === productType && p.customProductId === customProduct.id
              );
              if (!usage) return '';
              
              // Include size if selected, otherwise just mark as 'Used'
              return usage.size ?? 'Used';
            },
          });
        }
      } else {
        // Standard products (pad, tampon, liner):
        // Keep generic column with size as value
        const productLabel = productDef?.label ?? productType;
        
        columns.push({
          header: `Product: ${productLabel}`,
          section: 'products',
          getValue: (entry) => {
            const usage = entry.productUsage.find(p => p.productType === productType);
            if (!usage) return '';
            
            // Return the size/absorbency selected
            return usage.size ?? 'Used';
          },
        });
      }
    }
  }

  // ─────────────────────────────────────────
  // SECTION 5: General Symptoms (Gen. Sym:)
  // ─────────────────────────────────────────
  if (settings.symptoms.intensityTracking.enabled) {
    // Build set of period symptoms to exclude from general
    const periodSymptomSet = new Set([
      ...settings.periodTracking.periodSymptoms,
      ...settings.periodTracking.customPeriodSymptoms,
    ]);

    // Built-in selected symptoms (excluding period-only ones)
    for (const symptom of settings.symptoms.selected) {
      // Skip if it's ONLY a period symptom (not also a general symptom)
      // A symptom is "both" if it's in selected AND in periodSymptoms
      // A symptom is "period only" if it's in customPeriodSymptoms but only added to selected via that
      if (settings.periodTracking.customPeriodSymptoms.includes(symptom) && 
          !settings.symptoms.custom.includes(symptom)) {
        continue; // This is a custom period symptom, skip it for general
      }
      
      columns.push({
        header: `Gen. Sym: ${symptom}`,
        section: 'symptoms',
        getValue: (entry) => entry.symptomIntensities[symptom] ?? '',
      });
    }

    // Custom general symptoms (that aren't period symptoms)
    for (const symptom of settings.symptoms.custom) {
      if (!settings.symptoms.selected.includes(symptom)) {
        columns.push({
          header: `Gen. Sym: ${symptom}`,
          section: 'symptoms',
          getValue: (entry) => entry.symptomIntensities[symptom] ?? '',
        });
      }
    }
  }

  // ─────────────────────────────────────────
  // SECTION 6: Period Symptoms (Per. Sym:)
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled) {
    // Built-in period symptoms
    for (const symptom of settings.periodTracking.periodSymptoms) {
      columns.push({
        header: `Per. Sym: ${symptom}`,
        section: 'periodSymptoms',
        getValue: (entry) => entry.periodSymptomIntensities[symptom] ?? '',
      });
    }

    // Custom period symptoms
    for (const symptom of settings.periodTracking.customPeriodSymptoms) {
      columns.push({
        header: `Per. Sym: ${symptom}`,
        section: 'periodSymptoms',
        getValue: (entry) => entry.periodSymptomIntensities[symptom] ?? '',
      });
    }
  }

  // ─────────────────────────────────────────
  // SECTION 7: Medicines
  // ─────────────────────────────────────────
  if (settings.medicineTracking.enabled) {
    for (const medicine of settings.medicineTracking.medicines) {
      columns.push({
        header: `Med: ${medicine.name}`,
        section: 'medicines',
        getValue: (entry) => {
          const log = entry.medicineLog.find(m => m.medicineId === medicine.id);
          if (!log) return '';
          const parts: string[] = [];
          if (log.dosage) parts.push(log.dosage);
          if (log.time) {
            const timeStr = `${log.time.hour}:${log.time.minute.toString().padStart(2, '0')} ${log.time.period}`;
            parts.push(`@ ${timeStr}`);
          }
          return parts.join(' ') || 'Taken';
        },
      });
    }
  }
  return columns;
}

/**
 * Gets the existing headers from the entries sheet.
 * Returns null if the sheet doesn't exist.
 */
export async function getEntriesSheetHeaders(
  spreadsheetId: string,
  accessToken: string
): Promise<string[] | null> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ENTRIES_HEADERS_RANGE)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // Sheet doesn't exist
      if (error.error?.status === 'NOT_FOUND' || response.status === 400) {
        return null;
      }
      throw new Error('Failed to fetch headers');
    }

    const data = await response.json();
    return data.values?.[0] ?? null;
  } catch (error) {
    console.error('Error getting entries sheet headers:', error);
    return null;
  }
}

/**
 * Creates the entries sheet with headers based on current settings.
 */
export async function createEntriesSheet(
  spreadsheetId: string,
  accessToken: string,
  headers: string[]
): Promise<boolean> {
  try {
    // First, create the sheet
    const createResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: ENTRIES_SHEET_NAME,
                  hidden: false,
                },
              },
            },
          ],
        }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      // Sheet might already exist
      if (!error.error?.message?.includes('already exists')) {
        console.error('Error creating entries sheet:', error);
        return false;
      }
    }

    // Then, add headers
    const headersResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${ENTRIES_SHEET_NAME}'!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers],
        }),
      }
    );

    if (!headersResponse.ok) {
      console.error('Error setting headers:', await headersResponse.json());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating entries sheet:', error);
    return false;
  }
}

/**
 * Reconciles existing headers with canonical headers.
 * Returns the columns to insert and their positions.
 */
export function reconcileHeaders(
  existingHeaders: string[],
  canonicalColumns: SheetColumn[]
): {
  finalHeaders: string[];
  columnsToInsert: Array<{ header: string; position: number }>;
} {
  const existingSet = new Set(existingHeaders);
  const finalHeaders = [...existingHeaders];
  const columnsToInsert: Array<{ header: string; position: number }> = [];

  // Group canonical columns by section
  // Order must match buildCanonicalColumns to ensure proper column placement
  const sections: SheetColumn['section'][] = [
    'metadata',      // Date, Start Time, Pain Scale
    'closing',       // Notes, End Time
    'stool',         // Bristol Stool Scale
    'period',        // Cycle Phase, Flow
    'products',      // Period Products
    'symptoms',      // General Symptoms
    'periodSymptoms', // Period Symptoms
    'medicines',     // Medicines
  ];

  for (const column of canonicalColumns) {
    if (!existingSet.has(column.header)) {
      // Find the right position to insert this column
      // It should go after other columns in its section, or at the start of its section
      
      const sectionIndex = sections.indexOf(column.section);
      let insertPosition = finalHeaders.length; // Default: end

      // Find where this section ends in the existing headers
      for (let i = finalHeaders.length - 1; i >= 0; i--) {
        const existingColumn = canonicalColumns.find(c => c.header === finalHeaders[i]);
        if (existingColumn) {
          const existingSectionIndex = sections.indexOf(existingColumn.section);
          if (existingSectionIndex <= sectionIndex) {
            insertPosition = i + 1;
            break;
          }
        }
      }

      // Special case: 'closing' section should always be at the end
      if (column.section === 'closing') {
        // Find where closing section starts
        const closingColumns = canonicalColumns.filter(c => c.section === 'closing');
        const firstClosingInFinal = finalHeaders.findIndex(h => 
          closingColumns.some(c => c.header === h)
        );
        
        if (firstClosingInFinal === -1) {
          insertPosition = finalHeaders.length;
        } else {
          insertPosition = firstClosingInFinal;
        }
      }

      columnsToInsert.push({ header: column.header, position: insertPosition });
      finalHeaders.splice(insertPosition, 0, column.header);
      existingSet.add(column.header);
    }
  }

  return { finalHeaders, columnsToInsert };
}

/**
 * Inserts new columns into the sheet at specific positions.
 */
export async function insertSheetColumns(
  spreadsheetId: string,
  accessToken: string,
  sheetId: number,
  columnsToInsert: Array<{ header: string; position: number }>
): Promise<boolean> {
  if (columnsToInsert.length === 0) return true;

  try {
    // Sort by position descending so insertions don't affect other positions
    const sortedColumns = [...columnsToInsert].sort((a, b) => b.position - a.position);

    const requests = sortedColumns.map(col => ({
      insertDimension: {
        range: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: col.position,
          endIndex: col.position + 1,
        },
        inheritFromBefore: col.position > 0,
      },
    }));

    // First, insert the columns
    const insertResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    );

    if (!insertResponse.ok) {
      console.error('Error inserting columns:', await insertResponse.json());
      return false;
    }

    // Then, update the header row with new column names
    // We need to update each new column's header
    for (const col of columnsToInsert) {
      const columnLetter = getColumnLetter(col.position);
      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${ENTRIES_SHEET_NAME}'!${columnLetter}1?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[col.header]],
          }),
        }
      );

      if (!updateResponse.ok) {
        console.error('Error updating header:', await updateResponse.json());
      }
    }

    return true;
  } catch (error) {
    console.error('Error inserting columns:', error);
    return false;
  }
}

/**
 * Converts a 0-based column index to a column letter (A, B, ..., Z, AA, AB, ...)
 */
function getColumnLetter(index: number): string {
  let letter = '';
  let temp = index;
  
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  
  return letter;
}

/**
 * Gets the sheet ID for the entries sheet.
 */
export async function getEntriesSheetId(
  spreadsheetId: string,
  accessToken: string
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const entriesSheet = data.sheets?.find(
      (sheet: { properties: { title: string } }) => 
        sheet.properties.title === ENTRIES_SHEET_NAME
    );

    return entriesSheet?.properties?.sheetId ?? null;
  } catch (error) {
    console.error('Error getting sheet ID:', error);
    return null;
  }
}

/**
 * Appends an entry row to the entries sheet.
 * This is the main function called when submitting an entry.
 */
export async function appendEntryToSheet(
  entry: StoredEntry,
  settings: UserSettings,
  spreadsheetId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Build canonical columns based on current settings
    const canonicalColumns = buildCanonicalColumns(settings);
    const canonicalHeaders = canonicalColumns.map(c => c.header);

    // Step 2: Get existing headers (or null if sheet doesn't exist)
    let existingHeaders = await getEntriesSheetHeaders(spreadsheetId, accessToken);

    // Step 3: Create sheet if it doesn't exist
    if (existingHeaders === null) {
      const created = await createEntriesSheet(spreadsheetId, accessToken, canonicalHeaders);
      if (!created) {
        return { success: false, error: 'Failed to create entries sheet' };
      }
      existingHeaders = canonicalHeaders;
    }

    // Step 4: Reconcile headers - check if new columns need to be added
    const { finalHeaders, columnsToInsert } = reconcileHeaders(existingHeaders, canonicalColumns);

    // Step 5: Insert any new columns
    if (columnsToInsert.length > 0) {
      const sheetId = await getEntriesSheetId(spreadsheetId, accessToken);
      if (sheetId !== null) {
        await insertSheetColumns(spreadsheetId, accessToken, sheetId, columnsToInsert);
        // Update header row with all headers
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${ENTRIES_SHEET_NAME}'!A1?valueInputOption=RAW`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [finalHeaders],
            }),
          }
        );
      }
    }

    // Step 6: Build the row data matching the header order
    const rowData: (string | number)[] = finalHeaders.map(header => {
      const column = canonicalColumns.find(c => c.header === header);
      if (column) {
        return column.getValue(entry);
      }
      // Column exists in sheet but not in current settings (disabled feature)
      // Return empty string to preserve column alignment
      return '';
    });

    // Step 7: Append the row using the APPEND endpoint (this adds, doesn't overwrite)
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${ENTRIES_SHEET_NAME}'!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!appendResponse.ok) {
      const error = await appendResponse.json();
      console.error('Error appending entry:', error);
      return { success: false, error: error.error?.message || 'Failed to append entry' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in appendEntryToSheet:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Helper to extract spreadsheet ID from URL
 */
export function getSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}