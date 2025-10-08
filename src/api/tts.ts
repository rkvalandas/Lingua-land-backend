import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import path from "path";
import fs from "fs";
import { Request, Response } from "express";

interface TTSRequestBody {
  text: string;
  voice?: string;
}

export async function handleGenerateTTS(
  req: Request,
  res: Response
): Promise<void> {
  const { text, voice = "en-US-AriaNeural" } = req.body as TTSRequestBody;

  if (!text) {
    res
      .status(400)
      .json({ error: "Text is required for text-to-speech conversion." });
    return;
  }

  try {
    console.log(
      `[TTS] Generating for voice: ${voice}, text length: ${text.length}`
    );

    // Initialize MsEdgeTTS instance
    const tts = new MsEdgeTTS();

    // Set metadata for the voice and audio format - using MP3 for better compatibility
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // Use /tmp directory on Vercel (writable in serverless), fallback to local temp-audio
    const tempDir = process.env.VERCEL 
      ? "/tmp" 
      : path.join(process.cwd(), "temp-audio");
    
    // Create directory if it doesn't exist (only needed for local)
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate speech audio - toFile() returns an object with audioFilePath and metadataFilePath
    const result = await tts.toFile(tempDir, text);
    const audioFilePath = result.audioFilePath;

    // Verify file was created
    if (!fs.existsSync(audioFilePath)) {
      throw new Error("Audio file was not created");
    }

    // Read the file content as base64
    const audioBuffer = fs.readFileSync(audioFilePath);
    const base64Audio = audioBuffer.toString("base64");

    // Delete the temporary files
    try {
      fs.unlinkSync(audioFilePath);
      if (result.metadataFilePath && fs.existsSync(result.metadataFilePath)) {
        fs.unlinkSync(result.metadataFilePath);
      }
    } catch (err) {
      console.error("Error deleting temporary file:", err);
    }

    console.log("[TTS] Generated successfully");

    // Return the base64 data instead of streaming the file
    res.json({
      audioData: `data:audio/mp3;base64,${base64Audio}`,
      format: "mp3",
      voice: voice,
      success: true,
    });
  } catch (error: any) {
    console.error("[TTS] Error:", error.message || error);

    // Send success response with fallback flag instead of 500 error
    res.status(200).json({
      error: "Server TTS unavailable",
      details: error?.message || "Connection error",
      fallback: true,
      success: false,
    });
  }
}
