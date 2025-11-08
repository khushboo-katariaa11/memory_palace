# Memory Palace Mobile App

A React Native mobile application for creating and managing AI-powered memory narratives for people with memory loss conditions like dementia and Alzheimer's.

## Features

- **Upload Memories**: Add photos, videos, and audio files
- **AI Processing**: Automatic image captioning, audio transcription, and video keyframe extraction
- **Face Detection & Tagging**: Identify and tag people in photos
- **Story Generation**: AI-generated personalized memory stories using Gemini
- **Text-to-Speech**: Narration of memory stories
- **Memory Search**: Vector-based semantic search to find memories
- **Offline-First**: All processing happens locally with optional cloud backup

## Tech Stack

- **Frontend**: React Native with Expo
- **Navigation**: React Navigation
- **Media**: Expo Image Picker, Document Picker, AV
- **Backend API**: FastAPI (Python)
- **AI Models**:
  - Gemini 2.5 Flash (captions, transcription, story generation)
  - MediaPipe (face detection)
  - ChromaDB (vector embeddings)

## Prerequisites

- Node.js 16+
- Expo CLI
- iOS Simulator (Mac) or Android Emulator
- Backend server running (see backend setup)

## Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure API endpoint:
Edit `src/config/api.js` and update `API_BASE_URL` to your backend server address:
```javascript
const API_BASE_URL = 'http://YOUR_IP:8000'; // For physical devices
// or
const API_BASE_URL = 'http://localhost:8000'; // For emulators
```

3. Start the development server:
```bash
npm start
```

4. Run on device/emulator:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app for physical device

## Project Structure

```
mobile/
├── src/
│   ├── config/
│   │   └── api.js              # API client and endpoints
│   ├── screens/
│   │   ├── HomeScreen.js       # Main dashboard
│   │   ├── UploadScreen.js     # Upload media files
│   │   ├── MemoriesScreen.js   # Browse all memories
│   │   ├── MemoryDetailScreen.js # View memory details
│   │   ├── FaceTaggingScreen.js  # Tag people in photos
│   │   └── SearchScreen.js     # Search memories
├── App.js                      # Main app navigation
├── app.json                    # Expo configuration
├── package.json                # Dependencies
└── README.md                   # This file
```

## API Endpoints Used

### Upload & Processing
- `POST /upload` - Upload media files
- `POST /process/{memory_id}` - Process uploaded files with AI
- `POST /faces/{memory_id}/detect` - Detect faces in photos
- `POST /faces/{memory_id}/tag` - Tag detected faces

### Story & Narration
- `POST /generate_story/{memory_id}` - Generate AI story
- `POST /narrate/{memory_id}` - Create audio narration

### Retrieval
- `GET /memories` - List all memories
- `GET /memory/{memory_id}` - Get memory details
- `POST /search` - Vector-based semantic search

## Key Features Explained

### 1. Upload Flow
- Select photos, videos, or audio
- Upload to backend
- AI automatically processes (captions, transcription, face detection)
- Option to tag people in photos

### 2. Face Tagging
- Faces are automatically detected using MediaPipe
- Manual labeling by family members
- Labels stored for story personalization

### 3. Story Generation
- Combines captions, transcripts, and face labels
- Uses Gemini to create warm, emotional narrative
- Text-to-speech creates audio narration

### 4. Memory Search
- Vector embeddings using ChromaDB
- Semantic search (not just keyword matching)
- Filter by person name
- Shows relevance score

## Backend Setup

Make sure the FastAPI backend is running:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Required environment variables in backend `.env`:
```
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
```

## Network Configuration

### For Physical Devices:
1. Ensure device and computer are on the same WiFi
2. Update `API_BASE_URL` to your computer's IP address
3. Backend must run with `--host 0.0.0.0`

### For Emulators:
- iOS Simulator: `http://localhost:8000`
- Android Emulator: `http://10.0.2.2:8000`

## Troubleshooting

### Image Picker Not Working
- Ensure permissions are granted in `app.json`
- Request runtime permissions in code

### API Connection Failed
- Check backend is running: `http://YOUR_IP:8000/health`
- Verify firewall settings
- Confirm API_BASE_URL is correct

### Face Detection Not Working
- Ensure photos contain clear faces
- MediaPipe requires faces to be visible and unobscured
- Check backend logs for errors

## Building for Production

### iOS:
```bash
expo build:ios
```

### Android:
```bash
expo build:android
```

## License

MIT

## Support

For issues or questions, please refer to the main project repository.
