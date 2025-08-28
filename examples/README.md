# DayWatch Import Examples

This folder contains sample files demonstrating how to import bulk events into DayWatch.

## How to Import Events

1. **Click the Import Button** (⬆) in the sidebar
2. **Choose your method**:
   - **Upload File**: Drag & drop or browse for a file
   - **Paste Text**: Copy and paste your data directly

## Supported Formats

### 1. CSV Format (`sample-events.csv`)

**Structure**: `Name, Date, Color, Show on Main, Time, Location, Link`

```csv
Name,Date,Color,Show on Main,Time,Location,Link
Christmas Day,2024-12-25,#ff0000,true,09:00,Home,
Birthday Party,2025-01-15,#ff69b4,true,18:00,Restaurant,
Work Conference,2025-02-10,#0066cc,true,09:00,Convention Center,https://conference.example.com
```

**Notes**:
- Header row is optional (auto-detected)
- Date format: YYYY-MM-DD
- Color: Hex format (#rrggbb)
- Show on Main: true/false
- Time: HH:MM format (optional)
- Location and Link are optional

### 2. JSON Format (`sample-events.json`)

```json
[
  {
    "name": "Product Launch",
    "date": "2024-12-30",
    "color": "#007bff",
    "showOnMainScreen": true,
    "time": "10:00",
    "location": "Conference Room A",
    "link": "https://company.com/launch"
  }
]
```

**Notes**:
- Can be a single object or array of objects
- All fields except `name` and `date` are optional
- Date can be any valid date string

### 3. Text Format (DayWatch native)

```
Event Name; 2024-12-25; #ff0000; true; 12:00; Location; https://example.com
Another Event; 2025-01-01; #00ff00; false; ; ; 
```

**Notes**:
- Semicolon-separated values
- Same field order as CSV
- Empty fields can be left blank

## Import Options

- **Replace all timers**: Removes existing timers and imports new ones
- **Add to existing timers**: Keeps current timers and adds imported ones

## Tips

1. **Auto-detection**: The system automatically detects the format
2. **Preview first**: Use the Preview button to check your data before importing
3. **Validation**: Invalid entries are automatically skipped
4. **Backup**: Consider exporting your current timers before importing new ones

## Common Use Cases

- **Event Planning**: Import conference schedules, wedding timelines
- **Project Management**: Import milestone dates, deadlines
- **Personal**: Import birthdays, anniversaries, appointments
- **Academic**: Import exam dates, assignment deadlines
- **Business**: Import product launches, meeting schedules

## Troubleshooting

- **No timers imported**: Check date format (YYYY-MM-DD works best)
- **Colors not showing**: Ensure hex format (#rrggbb)
- **Times not displaying**: Use HH:MM format (24-hour)
- **File not loading**: Ensure file is .csv, .json, or .txt

## Creating Your Own Import File

### From Excel/Google Sheets:
1. Create columns: Name, Date, Color, Show on Main, Time, Location, Link
2. Fill in your data
3. Export as CSV
4. Import into DayWatch

### From Calendar Apps:
1. Export events as CSV
2. Adjust column order to match DayWatch format
3. Import into DayWatch

### From Project Management Tools:
1. Export milestones/deadlines
2. Format as JSON or CSV
3. Import into DayWatch
