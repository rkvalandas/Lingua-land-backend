import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import path from "path";
import fs from "fs";
import { Request, Response } from "express";

interface TTSRequestBody {
  text: string;
  voice?: string;
}

export async function handleGenerateTTS(req: Request, res: Response): Promise<void> {
  const { text, voice = "en-US-AriaNeural" } = req.body as TTSRequestBody;

  if (!text) {
    res
      .status(400)
      .json({ error: "Text is required for text-to-speech conversion." });
    return;
  }

  try {
    // Initialize MsEdgeTTS instance
    const tts = new MsEdgeTTS();

    // Set metadata for the voice and audio format - using MP3 for better compatibility
    await tts.setMetadata(
      voice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    // Create temp directory in project root
    const tempDir = path.join(process.cwd(), "temp-audio");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Define output file path with unique name
    const uniqueFilename = `audio1.mp3`;
    const outputPath = path.join(tempDir, uniqueFilename);

    // Generate speech audio and save it to a file
    await tts.toFile(outputPath, text);

    // Read the file content as base64
    const audioBuffer = fs.readFileSync(outputPath);
    const base64Audio = audioBuffer.toString("base64");

    // Delete the temporary file
    try {
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error("Error deleting temporary file:", err);
    }

    // Return the base64 data instead of streaming the file
    res.json({
      audioData: `data:audio/mp3;base64,${base64Audio}`,
      format: "mp3",
    });
  } catch (error) {
    console.error("Error during text-to-speech conversion:", error);
    res
      .status(500)
      .json({ error: "Failed to generate text-to-speech output." });
  }
}