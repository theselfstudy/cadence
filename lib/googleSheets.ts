// ============================================
// Google Sheets API Helpers
// ============================================

import type { StoredEntry, UserSettings, SheetColumn } from '@/types';
import { PRODUCT_OPTIONS } from '@/lib/constants';

// ============================================
// SHEET NAMES & RANGES
// ============================================

const SETTINGS_SHEET_NAME = ".trackwell-settings";
const COLUMN_MAP_SHEET_NAME = ".trackwell-column-map";
const ENTRIES_SHEET_NAME = "TrackWell-Entries";

const SETTINGS_RANGE = `'${SETTINGS_SHEET_NAME}'!A1`;
const COLUMN_MAP_RANGE = `'${COLUMN_MAP_SHEET_NAME}'!A1`;
const ENTRIES_HEADERS_RANGE = `'${ENTRIES_SHEET_NAME}'!1:1`;

// ============================================
// TYPES
// ============================================

interface ColumnMap {
  columns: Record<string, number>;
  nextColumn: number;
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

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

async function _createHiddenSheet(
  spreadsheetId: string,
  accessToken: string,
  sheetName: string
): Promise<boolean> {
  try {
    const response = await fetch(
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
    return response.ok;
  } catch (error) {
    console.error(`Error creating hidden sheet ${sheetName}:`, error);
    return false;
  }
}

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

export async function deleteSettingsSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
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
      console.error("Failed to get spreadsheet info");
      return false;
    }

    const data = await response.json();
    const settingsSheet = data.sheets?.find(
      (sheet: { properties: { title: string } }) =>
        sheet.properties.title === SETTINGS_SHEET_NAME
    );

    if (!settingsSheet) {
      console.log("Settings sheet not found, nothing to delete");
      return true;
    }

    const sheetId = settingsSheet.properties.sheetId;

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
// COLUMN MAP FUNCTIONS
// ============================================

async function getColumnMapFromSheet(
  spreadsheetId: string,
  accessToken: string
): Promise<ColumnMap | null> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(COLUMN_MAP_RANGE)}`,
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
    const jsonString = data.values?.[0]?.[0];
    
    if (!jsonString) {
      return null;
    }

    return JSON.parse(jsonString) as ColumnMap;
  } catch (error) {
    console.error("Error reading column map:", error);
    return null;
  }
}

async function saveColumnMapToSheet(
  columnMap: ColumnMap,
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(columnMap);

    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(COLUMN_MAP_RANGE)}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[jsonString]],
        }),
      }
    );

    if (updateResponse.status === 400) {
      await _createHiddenSheet(spreadsheetId, accessToken, COLUMN_MAP_SHEET_NAME);
      return await saveColumnMapToSheet(columnMap, spreadsheetId, accessToken);
    }

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.json();
      console.error("Error saving column map:", errorBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error saving column map:", error);
    return false;
  }
}

function createInitialColumnMap(headers: string[]): ColumnMap {
  const columns: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    columns[header] = index;
  });

  return {
    columns,
    nextColumn: headers.length,
  };
}

// ============================================
// CANONICAL COLUMNS BUILDER
// ============================================

/**
 * Builds the canonical column order based on current user settings.
 * 
 * ORDER:
 * 1. Date, Start Time (always first)
 * 2. Notes, End Time (always second group)
 * 3. Pain Scale
 * 4. Stool tracking
 * 5. Period/Cycle tracking
 * 6. Products
 * 7. General Symptoms
 * 8. Period Symptoms
 * 9. Medicines
 */
export function buildCanonicalColumns(settings: UserSettings): SheetColumn[] {
  const columns: SheetColumn[] = [];

  // ─────────────────────────────────────────
  // SECTION 1: Time Start (always present)
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

  // ─────────────────────────────────────────
  // SECTION 2: Closing (always present, but placed early)
  // ─────────────────────────────────────────
  columns.push({
    header: 'Notes',
    section: 'closing',
    getValue: (entry) => entry.notes ?? '',
  });
  
  columns.push({
    header: 'End Time',
    section: 'closing',
    getValue: (entry) => entry.endTime,
  });

  // ─────────────────────────────────────────
  // SECTION 3: Pain Scale (always present)
  // ─────────────────────────────────────────
  columns.push({
    header: 'Pain Scale',
    section: 'metadata',
    getValue: (entry) => entry.painScale,
  });

  // ─────────────────────────────────────────
  // SECTION 4: Stool Tracking
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
  // SECTION 5: Period/Cycle Tracking
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
  // SECTION 6: Products
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
  // SECTION 7: General Symptoms
  // ─────────────────────────────────────────
  if (settings.symptoms.intensityTracking.enabled) {
    for (const symptom of settings.symptoms.selected) {
      if (settings.periodTracking.customPeriodSymptoms.includes(symptom) && 
          !settings.symptoms.custom.includes(symptom)) {
        continue;
      }
      
      columns.push({
        header: `Gen. Sym: ${symptom}`,
        section: 'symptoms',
        getValue: (entry) => entry.symptomIntensities[symptom] ?? '',
      });
    }

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
  // SECTION 8: Period Symptoms
  // ─────────────────────────────────────────
  if (settings.periodTracking.enabled) {
    for (const symptom of settings.periodTracking.periodSymptoms) {
      columns.push({
        header: `Per. Sym: ${symptom}`,
        section: 'periodSymptoms',
        getValue: (entry) => entry.periodSymptomIntensities[symptom] ?? '',
      });
    }

    for (const symptom of settings.periodTracking.customPeriodSymptoms) {
      columns.push({
        header: `Per. Sym: ${symptom}`,
        section: 'periodSymptoms',
        getValue: (entry) => entry.periodSymptomIntensities[symptom] ?? '',
      });
    }
  }

  // ─────────────────────────────────────────
  // SECTION 9: Medicines
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

// ============================================
// ENTRIES SHEET HELPERS
// ============================================

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

export async function createEntriesSheet(
  spreadsheetId: string,
  accessToken: string,
  headers: string[]
): Promise<boolean> {
  try {
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
      if (!error.error?.message?.includes('already exists')) {
        console.error('Error creating entries sheet:', error);
        return false;
      }
    }

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

function getColumnLetter(index: number): string {
  let letter = '';
  let temp = index;
  
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  
  return letter;
}

async function appendNewHeaders(
  spreadsheetId: string,
  accessToken: string,
  newHeaders: string[],
  startColumnIndex: number
): Promise<boolean> {
  if (newHeaders.length === 0) return true;

  try {
    const startLetter = getColumnLetter(startColumnIndex);
    const endLetter = getColumnLetter(startColumnIndex + newHeaders.length - 1);
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${ENTRIES_SHEET_NAME}'!${startLetter}1:${endLetter}1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [newHeaders],
        }),
      }
    );

    if (!response.ok) {
      console.error('Error appending headers:', await response.json());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error appending headers:', error);
    return false;
  }
}

// ============================================
// MAIN ENTRY FUNCTION
// ============================================

export async function appendEntryToSheet(
  entry: StoredEntry,
  settings: UserSettings,
  spreadsheetId: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Build canonical columns based on current settings
    const canonicalColumns = buildCanonicalColumns(settings);

    // Step 2: Get or create the column map
    let columnMap = await getColumnMapFromSheet(spreadsheetId, accessToken);

    if (columnMap === null) {
      const existingHeaders = await getEntriesSheetHeaders(spreadsheetId, accessToken);

      if (existingHeaders === null) {
        // Brand new sheet
        const canonicalHeaders = canonicalColumns.map(c => c.header);
        
        const created = await createEntriesSheet(spreadsheetId, accessToken, canonicalHeaders);
        if (!created) {
          return { success: false, error: 'Failed to create entries sheet' };
        }

        columnMap = createInitialColumnMap(canonicalHeaders);
        await saveColumnMapToSheet(columnMap, spreadsheetId, accessToken);
        
        console.log('Created new entries sheet with column map');
      } else {
        // Sheet exists but no column map — create from existing headers
        columnMap = createInitialColumnMap(existingHeaders);
        await saveColumnMapToSheet(columnMap, spreadsheetId, accessToken);
        
        console.log('Created column map from existing headers');
      }
    }

    // Step 3: Find new columns not in the map
    const newColumns: SheetColumn[] = [];
    for (const column of canonicalColumns) {
      if (!(column.header in columnMap.columns)) {
        newColumns.push(column);
      }
    }

    // Step 4: Append new columns to the end
    if (newColumns.length > 0) {
      const newHeaders = newColumns.map(c => c.header);
      const startIndex = columnMap.nextColumn;

      await appendNewHeaders(spreadsheetId, accessToken, newHeaders, startIndex);

      newColumns.forEach((column, i) => {
        columnMap!.columns[column.header] = startIndex + i;
      });
      columnMap.nextColumn = startIndex + newColumns.length;

      await saveColumnMapToSheet(columnMap, spreadsheetId, accessToken);
      
      console.log(`Appended ${newColumns.length} new columns:`, newHeaders);
    }

    // Step 5: Build row data using column map
    const rowData: (string | number)[] = new Array(columnMap.nextColumn).fill('');

    for (const column of canonicalColumns) {
      const position = columnMap.columns[column.header];
      if (position !== undefined) {
        rowData[position] = column.getValue(entry);
      }
    }

    // Step 6: Append the row
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

export function getSpreadsheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}