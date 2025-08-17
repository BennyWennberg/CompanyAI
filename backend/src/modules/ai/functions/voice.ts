// AI Module - Voice Integration
// Speech-to-Text (Whisper) und Text-to-Speech (OpenAI TTS)
// Basierend auf Open WebUI Voice Features

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import type { VoiceToTextRequest, TextToVoiceRequest, VoiceResponse } from '../types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VOICE_UPLOADS_DIR = process.env.RAG_EXTERNAL_DOCS_PATH 
  ? path.resolve(process.env.RAG_EXTERNAL_DOCS_PATH, 'voice-uploads')
  : path.resolve(process.cwd(), 'backend', 'voice-uploads');

function ensureVoiceDir() {
  try {
    if (!fs.existsSync(VOICE_UPLOADS_DIR)) {
      console.log(`Erstelle Voice-Uploads-Ordner: ${VOICE_UPLOADS_DIR}`);
      fs.mkdirSync(VOICE_UPLOADS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen des Voice-Ordners:', error);
    throw new Error(`Voice-Ordner konnte nicht erstellt werden: ${error}`);
  }
}

/**
 * Speech-to-Text mit OpenAI Whisper
 */
export async function speechToText(
  audioBuffer: Buffer, 
  filename: string,
  options: VoiceToTextRequest
): Promise<VoiceResponse> {
  try {
    if (!OPENAI_API_KEY) {
      return {
        success: false,
        error: 'ConfigurationError',
        message: 'OPENAI_API_KEY fehlt für Speech-to-Text'
      };
    }

    ensureVoiceDir();

    // Temporäre Datei speichern
    const tempFilePath = path.join(VOICE_UPLOADS_DIR, `temp_${Date.now()}_${filename}`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    // FormData für Whisper API erstellen
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath), {
      filename: filename,
      contentType: `audio/${options.audioFormat}`
    });
    formData.append('model', 'whisper-1');
    if (options.language) {
      formData.append('language', options.language);
    }

    // Whisper API aufrufen
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 Sekunden Timeout
      }
    );

    // Temporäre Datei löschen
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.warn('Warnung: Temporäre Audio-Datei konnte nicht gelöscht werden:', cleanupError);
    }

    const transcribedText = response.data.text || '';
    
    console.log(`🎤 Speech-to-Text erfolgreich: "${transcribedText.substring(0, 50)}..."`);
    
    return {
      success: true,
      data: {
        text: transcribedText
      },
      message: 'Audio erfolgreich transkribiert'
    };

  } catch (error: any) {
    console.error('Speech-to-Text Fehler:', error);
    
    // Cleanup bei Fehler
    const tempFiles = fs.readdirSync(VOICE_UPLOADS_DIR)
      .filter(f => f.startsWith('temp_') && Date.now() - parseInt(f.split('_')[1]) > 300000); // 5 Min alt
    
    tempFiles.forEach(f => {
      try {
        fs.unlinkSync(path.join(VOICE_UPLOADS_DIR, f));
      } catch {}
    });

    return {
      success: false,
      error: 'SpeechToTextError',
      message: error?.response?.data?.error?.message || error?.message || 'Audio-Transkription fehlgeschlagen'
    };
  }
}

/**
 * Text-to-Speech mit OpenAI TTS
 */
export async function textToSpeech(request: TextToVoiceRequest): Promise<VoiceResponse> {
  try {
    if (!OPENAI_API_KEY) {
      return {
        success: false,
        error: 'ConfigurationError',
        message: 'OPENAI_API_KEY fehlt für Text-to-Speech'
      };
    }

    if (!request.text || request.text.trim().length === 0) {
      return {
        success: false,
        error: 'ValidationError',
        message: 'Text ist erforderlich für Text-to-Speech'
      };
    }

    // Text-Länge validieren (OpenAI TTS Limit: 4096 Zeichen)
    if (request.text.length > 4096) {
      return {
        success: false,
        error: 'ValidationError',
        message: 'Text ist zu lang (max. 4096 Zeichen für TTS)'
      };
    }

    ensureVoiceDir();

    // OpenAI TTS API aufrufen
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        input: request.text.trim(),
        voice: request.voice || 'alloy',
        response_format: request.format || 'mp3',
        speed: request.speed || 1.0
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000 // 60 Sekunden für längere Texte
      }
    );

    // Audio-Datei speichern
    const audioFileName = `tts_${Date.now()}.${request.format || 'mp3'}`;
    const audioFilePath = path.join(VOICE_UPLOADS_DIR, audioFileName);
    fs.writeFileSync(audioFilePath, response.data);

    // Audio-URL für Frontend bereitstellen
    const audioUrl = `/api/ai/voice/audio/${audioFileName}`;

    // Geschätzte Dauer (ungefähr 150 Wörter pro Minute)
    const wordCount = request.text.trim().split(/\s+/).length;
    const estimatedDuration = Math.ceil((wordCount / 150) * 60);

    console.log(`🔊 Text-to-Speech erfolgreich: ${wordCount} Wörter → ${audioFileName}`);

    return {
      success: true,
      data: {
        audioUrl,
        duration: estimatedDuration
      },
      message: 'Audio erfolgreich generiert'
    };

  } catch (error: any) {
    console.error('Text-to-Speech Fehler:', error);
    
    return {
      success: false,
      error: 'TextToSpeechError',
      message: error?.response?.data?.error?.message || error?.message || 'Audio-Generierung fehlgeschlagen'
    };
  }
}

/**
 * Audio-Datei für Frontend bereitstellen
 */
export function getAudioFile(filename: string): { success: boolean; filePath?: string; error?: string } {
  try {
    ensureVoiceDir();
    
    // Sicherheitscheck: Nur Dateien aus Voice-Ordner
    const safeFilename = path.basename(filename);
    const filePath = path.join(VOICE_UPLOADS_DIR, safeFilename);
    
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'Audio-Datei nicht gefunden'
      };
    }

    // Alte Dateien cleanup (älter als 24h)
    const fileStats = fs.statSync(filePath);
    const fileAge = Date.now() - fileStats.mtime.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 Stunden

    if (fileAge > maxAge) {
      fs.unlinkSync(filePath);
      return {
        success: false,
        error: 'Audio-Datei ist abgelaufen'
      };
    }

    return {
      success: true,
      filePath
    };

  } catch (error) {
    console.error('Audio-File-Fehler:', error);
    return {
      success: false,
      error: 'Fehler beim Laden der Audio-Datei'
    };
  }
}

/**
 * Voice-Ordner cleanup - alte Dateien entfernen
 */
export function cleanupVoiceFiles(): { removed: number } {
  try {
    ensureVoiceDir();
    
    const files = fs.readdirSync(VOICE_UPLOADS_DIR);
    const maxAge = 24 * 60 * 60 * 1000; // 24 Stunden
    let removed = 0;

    for (const file of files) {
      const filePath = path.join(VOICE_UPLOADS_DIR, file);
      const stats = fs.statSync(filePath);
      
      if (Date.now() - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Voice Cleanup: ${removed} alte Dateien entfernt`);
    }

    return { removed };

  } catch (error) {
    console.error('Voice Cleanup Fehler:', error);
    return { removed: 0 };
  }
}

/**
 * Unterstützte Audio-Formate validieren
 */
export function isValidAudioFormat(filename: string): boolean {
  const supportedFormats = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.flac'];
  const ext = path.extname(filename).toLowerCase();
  return supportedFormats.includes(ext);
}

/**
 * Audio-Format aus Filename extrahieren
 */
export function getAudioFormat(filename: string): VoiceToTextRequest['audioFormat'] {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  
  switch (ext) {
    case 'mp3': return 'mp3';
    case 'wav': return 'wav';
    case 'ogg': return 'ogg';
    case 'webm': return 'webm';
    case 'm4a': return 'mp3'; // Als MP3 behandeln
    case 'flac': return 'wav'; // Als WAV behandeln
    default: return 'mp3'; // Fallback
  }
}
