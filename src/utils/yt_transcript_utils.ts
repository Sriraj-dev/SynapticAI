
export async function fetchTranscriptFromPublicAPI(videoId: string): Promise<string | null> {
    try {
      const url = `${process.env.YOUTUBE_TRANSCRIPT_API_URL}/${videoId}`;
      const response = await fetch(url);
  
      if (!response.ok) {
        console.error(`Transcript API error: ${response.status} ${response.statusText}`);
        return null;
      }
  
      const transcript = await response.text();  // directly read text
      return transcript.trim();
    } catch (error) {
      console.error("Error fetching transcript from public API:", error);
      return null;
    }
}

export async function fetchTranscriptFromPythonScript(videoId: string): Promise<string | null> {
  const proc = Bun.spawn(["python3", "src/utils/transcript_generator.py", videoId], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  if (stderr) {
    console.error("Python stderr:", stderr);
  }

  try {
    const result = JSON.parse(stdout);
    if (result.transcript) {
      return result.transcript;
    } else {
      console.error("Transcript error:", result.error);
      return null;
    }
  } catch (err) {
    console.error("JSON parse error:", err);
    return null;
  }
}