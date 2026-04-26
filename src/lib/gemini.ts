import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY });

export async function scanNumberPlate(base64Image: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Extract the vehicle license plate number from this image. Only return the alphanumeric plate number, nothing else. If not found, return 'NOT_FOUND'." },
            {
              inlineData: {
                data: base64Image,
                mimeType: "image/jpeg"
              }
            }
          ]
        }
      ]
    });

    const text = response.text?.trim() || "";
    return text === "NOT_FOUND" ? "" : text;
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw error;
  }
}

export async function scanVehicleDetails(base64Image: string): Promise<{
  plate: string;
  brand: string;
  color: string;
  type: string;
}> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { 
              text: `Extract technical vehicle details from this image. 
                Return a JSON object with keys: plate (the number), brand (KIA, HYUNDAI, etc), color (RED, WHITE, etc), and type (CAR, BIKE, SCOOTER).
                If not visible, use value "NOT_FOUND". Only return JSON.` 
            },
            {
              inlineData: {
                data: base64Image,
                mimeType: "image/jpeg"
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plate: { type: Type.STRING },
            brand: { type: Type.STRING },
            color: { type: Type.STRING },
            type: { type: Type.STRING }
          },
          required: ["plate", "brand", "color", "type"]
        }
      }
    });

    const text = response.text || "{}";
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", text);
      return {
        plate: "NOT_FOUND",
        brand: "NOT_FOUND",
        color: "NOT_FOUND",
        type: "NOT_FOUND"
      };
    }
  } catch (error) {
    console.error("Gemini Details Scan Error:", error);
    throw error;
  }
}
