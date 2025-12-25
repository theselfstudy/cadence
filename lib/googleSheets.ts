// ============================================
// Google Sheets API Helpers
// ============================================

import type { StoredEntry, UserSettings, SheetColumn } from '@/types';
import { PRODUCT_OPTIONS } from '@/lib/constants';

// Sheet names
const SETTINGS_SHEET_NAME = ".TrackWell-settings";
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
 * 
 * COLUMN ORDER ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FIXED START        │ DYNAMIC MIDDLE (append-only)              │ FIXED END │
 * ├────────────────────┼───────────────────────────────────────────┼───────────┤
 * │ Date               │ Stool: Type, Feeling                      │ Notes     │
 * │ Start Time         │ Cycle Phase, Flow                         │           │
 * │ End Time           │ Products (append-only)                    │           │
 * │ Pain Scale         │ General Symptoms (append-only)            │           │
 * │                    │ Period Symptoms (append-only)             │           │
 * │                    │ Medicines (append-only)                   │           │
 * └────────────────────┴───────────────────────────────────────────┴───────────┘
 * 
 * Rules:
 * 1. Fixed columns don't change position
 * 2. New columns are appended to the end of their section
 * 3. Removed/archived symptoms leave columns in place (old entries keep data)
 * 4. Column headers in the sheet are the source of truth for positions
 */
export function buildCanonicalColumns(settings: UserSettings): SheetColumn[] {
  const columns: SheetColumn[] = [];

  // ─────────────────────────────────────────
  // SECTION 1: Fixed Start (always these 4, in this order)
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
    header: 'End Time',
    section: 'metadata',
    getValue: (entry) => entry.endTime,
  });
  
  columns.push({
    header: 'Pain Scale',
    section: 'metadata',
    getValue: (entry) => entry.painScale,
  });

  // ─────────────────────────────────────────
  // SECTION 2: Stool Tracking
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
  // SECTION 3: Period/Cycle Info
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled) {
    columns.push({
      header: 'Cycle Phase',
      section: 'period',
      getValue: (entry) => entry.cyclePhase ?? '',
    });

    if (settings.periodTracking.trackFlow) {
      columns.push({
        header: 'Period: Flow',
        section: 'period',
        getValue: (entry) => entry.periodFlow ?? '',
      });
    }
  }

  // ─────────────────────────────────────────
  // SECTION 4: Products (append-only)
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled && settings.periodTracking.productTracking?.enabled) {
    const selectedProducts = settings.periodTracking.productTracking.selectedProducts ?? [];
    const customProductsMap = settings.periodTracking.productTracking.customProducts ?? {};
    
    for (const productType of selectedProducts) {
      const productDef = PRODUCT_OPTIONS.find(p => p.type === productType);
      
      if (productDef?.allowCustomProducts) {
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
              return usage.size ?? 'Used';
            },
          });
        }
      } else {
        const productLabel = productDef?.label ?? productType;
        
        columns.push({
          header: `Product: ${productLabel}`,
          section: 'products',
          getValue: (entry) => {
            const usage = entry.productUsage.find(p => p.productType === productType);
            if (!usage) return '';
            return usage.size ?? 'Used';
          },
        });
      }
    }
  }

  // ─────────────────────────────────────────
  // SECTION 5: General Symptoms (append-only)
  // All general symptoms grouped together: defaults first, then custom
  // ─────────────────────────────────────────
  if (settings.symptoms.enabled && settings.symptoms.intensityTracking.enabled) {
    // Collect all general symptoms (selected built-in + custom)
    // Exclude symptoms that are ONLY period symptoms
    const periodOnlySymptoms = new Set(
      settings.periodTracking.customPeriodSymptoms.filter(
        s => !settings.symptoms.custom.includes(s)
      )
    );

    // First: selected built-in symptoms (in their selection order)
    for (const symptom of settings.symptoms.selected) {
      if (periodOnlySymptoms.has(symptom)) continue;
      
      columns.push({
        header: `Gen. Sym: ${symptom}`,
        section: 'symptoms',
        getValue: (entry) => entry.symptomIntensities[symptom] ?? '',
      });
    }

    // Then: custom general symptoms that weren't already added via selected
    // (This handles the case where custom symptoms aren't in 'selected' yet)
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
  // SECTION 6: Period Symptoms (append-only)
  // All period symptoms grouped together: selected first, then custom-only
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled) {
    // First: symptoms selected for period tracking (may overlap with general)
    for (const symptom of settings.periodTracking.periodSymptoms) {
      columns.push({
        header: `Per. Sym: ${symptom}`,
        section: 'periodSymptoms',
        getValue: (entry) => entry.periodSymptomIntensities[symptom] ?? '',
      });
    }

    // Then: custom period symptoms not already in periodSymptoms
    for (const symptom of settings.periodTracking.customPeriodSymptoms) {
      if (!settings.periodTracking.periodSymptoms.includes(symptom)) {
        columns.push({
          header: `Per. Sym: ${symptom}`,
          section: 'periodSymptoms',
          getValue: (entry) => entry.periodSymptomIntensities[symptom] ?? '',
        });
      }
    }
  }

  // ─────────────────────────────────────────
  // SECTION 7: Medicines (append-only)
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

  // ─────────────────────────────────────────
  // SECTION 8: Fixed End (Notes always last)
  // ─────────────────────────────────────────
  columns.push({
    header: 'Notes',
    section: 'closing',
    getValue: (entry) => entry.notes ?? '',
  });

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
 * Reconciles existing sheet headers with canonical headers from current settings.
 * 
 * Rules:
 * 1. Fixed columns (Date, Start, End, Pain Scale, Notes) maintain their positions
 * 2. New dynamic columns are APPENDED to the end of their section
 * 3. Existing columns that are no longer in settings are LEFT IN PLACE (for historical data)
 * 4. Column order in the sheet is preserved - we only add, never remove or reorder
 */
export function reconcileHeaders(
  existingHeaders: string[],
  canonicalColumns: SheetColumn[]
): {
  finalHeaders: string[];
  columnsToInsert: Array<{ header: string; position: number }>;
  hasChanges: boolean;
} {
  const existingSet = new Set(existingHeaders);
  const finalHeaders = [...existingHeaders];
  const columnsToInsert: Array<{ header: string; position: number }> = [];

  // Define section boundaries for insertion
  // Order matters: this is the order sections appear in the sheet
  const sectionOrder: SheetColumn['section'][] = [
    'metadata',       // Date, Start Time, End Time, Pain Scale (fixed)
    'stool',          // Stool: Type, Stool: Feeling
    'period',         // Cycle Phase, Period: Flow
    'products',       // Product: X, Product: Y...
    'symptoms',       // Gen. Sym: A, Gen. Sym: B...
    'periodSymptoms', // Per. Sym: A, Per. Sym: B...
    'medicines',      // Med: X, Med: Y...
    'closing',        // Notes (fixed at end)
  ];

  // Helper: find the last column index of a given section in the current headers
  const findSectionEndIndex = (section: SheetColumn['section']): number => {
    let lastIndex = -1;
    
    for (let i = 0; i < finalHeaders.length; i++) {
      const header = finalHeaders[i];
      const column = canonicalColumns.find(c => c.header === header);
      
      // Also check existing columns that might not be in canonical anymore
      const inferredSection = inferSectionFromHeader(header);
      
      if (column?.section === section || inferredSection === section) {
        lastIndex = i;
      }
    }
    
    return lastIndex;
  };

  // Helper: find where a section SHOULD start (after previous sections)
  const findSectionInsertPoint = (section: SheetColumn['section']): number => {
    const sectionIdx = sectionOrder.indexOf(section);
    
    // Special case: Notes always goes at the very end
    if (section === 'closing') {
      // Find if Notes already exists
      const notesIdx = finalHeaders.indexOf('Notes');
      if (notesIdx !== -1) return notesIdx;
      return finalHeaders.length;
    }
    
    // Find the end of the previous section, or start of next section
    for (let i = sectionIdx - 1; i >= 0; i--) {
      const prevSectionEnd = findSectionEndIndex(sectionOrder[i]);
      if (prevSectionEnd !== -1) {
        return prevSectionEnd + 1;
      }
    }
    
    // No previous sections found, insert after metadata
    // Metadata is always first 4 columns
    return 4;
  };

  // Process each canonical column
  for (const column of canonicalColumns) {
    if (!existingSet.has(column.header)) {
      // This is a new column - need to insert it
      
      let insertPosition: number;
      
      if (column.section === 'closing') {
        // Notes always at the end
        insertPosition = finalHeaders.length;
      } else if (column.section === 'metadata') {
        // Metadata columns should be at fixed positions (0-3)
        // But if sheet already exists, they should already be there
        // This handles edge case of upgrading old sheets
        const metadataHeaders = ['Date', 'Start Time', 'End Time', 'Pain Scale'];
        insertPosition = metadataHeaders.indexOf(column.header);
        if (insertPosition === -1) insertPosition = 4; // After metadata
      } else {
        // Dynamic section: append at end of its section
        const sectionEnd = findSectionEndIndex(column.section);
        
        if (sectionEnd !== -1) {
          // Section exists, append after last column in section
          insertPosition = sectionEnd + 1;
        } else {
          // Section doesn't exist yet, find where it should go
          insertPosition = findSectionInsertPoint(column.section);
        }
        
        // Make sure we don't insert after Notes
        const notesIdx = finalHeaders.indexOf('Notes');
        if (notesIdx !== -1 && insertPosition > notesIdx) {
          insertPosition = notesIdx;
        }
      }
      
      columnsToInsert.push({ header: column.header, position: insertPosition });
      finalHeaders.splice(insertPosition, 0, column.header);
      existingSet.add(column.header);
    }
  }

  return { 
    finalHeaders, 
    columnsToInsert,
    hasChanges: columnsToInsert.length > 0
  };
}

/**
 * Infers the section of a header based on its prefix.
 * Used for columns that exist in the sheet but aren't in current settings
 * (e.g., archived symptoms).
 */
function inferSectionFromHeader(header: string): SheetColumn['section'] | null {
  if (header === 'Date' || header === 'Start Time' || header === 'End Time' || header === 'Pain Scale') {
    return 'metadata';
  }
  if (header === 'Notes') {
    return 'closing';
  }
  if (header.startsWith('Stool:')) {
    return 'stool';
  }
  if (header === 'Cycle Phase' || header.startsWith('Period:')) {
    return 'period';
  }
  if (header.startsWith('Product:')) {
    return 'products';
  }
  if (header.startsWith('Gen. Sym:')) {
    return 'symptoms';
  }
  if (header.startsWith('Per. Sym:')) {
    return 'periodSymptoms';
  }
  if (header.startsWith('Med:')) {
    return 'medicines';
  }
  return null;
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