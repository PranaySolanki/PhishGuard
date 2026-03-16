import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";


const raw_api_key = (process.env.EXPO_PUBLIC_GEMINI_API_KEY)?.toString();

if (!raw_api_key) {
  throw new Error("EXPO_PUBLIC_GEMINI_API_KEY environment variable is not set");
}

function rot13(str: string) {
  return str.replace(/[A-Za-z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

// Decode the ROT13-encoded value stored in the env var
const api_key = rot13(raw_api_key);


const genAI = new GoogleGenerativeAI(api_key);

const schema: Schema = {
  type: SchemaType.OBJECT,
  description: "Security analysis result",
  properties: {
    risk: {
      type: SchemaType.STRING,
      description: "Risk level: LOW, MEDIUM, or HIGH",
      nullable: false,
    },
    score: {
      type: SchemaType.NUMBER,
      description: "Safety score from 0-100",
      nullable: false,
    },
    reason: {
      type: SchemaType.STRING,
      description: "Brief explanation of why this risk level was assigned",
      nullable: false,
    },
    recommendation: {
      type: SchemaType.STRING,
      description: "Actionable advice in 1-2 sentences",
      nullable: false,
    },
  },
  required: ["risk", "score", "reason", "recommendation"],
};

// Now pass it to the model
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
  },
});

// Vision model for image analysis (no schema needed for QR extraction)
const visionModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});



export const analyzePhisingAttempt = async (content: string, type: 'EMAIL' | 'SMS' | 'URL') => {
  const typeSpecificInstructions = {
    EMAIL: "Focus on brand impersonation, generic greetings, and mismatched link destinations, senders email address, tonality.",
    SMS: "Focus on extreme urgency, link shorteners, and requests for OTP/KYC updates online via links if it tells to visit a physical branch then it might be safe yet not completely safe.",
    URL: "Perform a deep domain audit. Check for homograph attacks (e.g., 'hbfc' vs 'hdfc') and character substitutions."
  };
  const prompt = `
        ACT AS A SENIOR CYBERSECURITY THREAT ANALYST. 
        Perform a STRICT, ZERO-TRUST analysis on the provided content. 
        Analyze the following ${type} content for phishing attempts, suspicious links, 
        urgency tactics, or credential harvesting patterns. Try to give short answers and precise with exact information about whats wrong in the link if there is a link within the content and Analyze the provided content for "Lookalike Domain" attacks (homograph attacks).
    
        STRICT AUDIT STEPS:
        1. IDENTIFY THE TARGET: Is this message pretending to be a known brand (e.g., HDFC, Amazon, Netflix, Google)?
        2. DOMAIN AUDIT: If a URL is present, compare it to the official domain of the identified brand. Flag "Lookalike" domains (e.g., 'hbfc.com' vs 'hdfc.com', 'micros0ft.com' vs 'microsoft.com') as HIGH RISK.
        3. LINGUISTIC ANALYSIS: Check for "Panic Inducers" (e.g., "Account suspended," "Unauthorized login," "Action required within 1 hour").
        4. REQUEST AUDIT: Does it ask for sensitive info (OTP, Password, KYC updates) via an unofficial link?
        Perform a deep domain audit. Check for homograph attacks (e.g., 'hbfc' vs 'hdfc') and character substitutions.

        TYPE-SPECIFIC FOCUS: ${typeSpecificInstructions[type]}

        OUTPUT FORMAT:
        You must return JSON with:
        - risk: "LOW", "MEDIUM", or "HIGH"
        - score: (0-100, where 100 is safest)
        - reason: A technical explanation of the specific red flags found.
        - recommendation: Actionable advice in 1-2 sentences.
        
        Content to analyze: "${content}"
    `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error("Invalid JSON response from Gemini API");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const analyzeQrCode = async (content: string) => {
  const prompt = `
        ACT AS A SPECIALIST IN QR THREAT INTELLIGENCE (QUISHING).
        YOUR TASK: Analyze the provided URL extracted from a QR Code scan.

        STRICT AUDIT STEPS FOR QR:
        1. DE-OBFUSCATION: Is the URL using a common shortener (e.g., bit.ly, tinyurl, t.co)? If yes, flag as MEDIUM RISK and warn that the final destination is hidden.
        2. CREDENTIAL TRAP: Does the URL lead directly to a login page (e.g., /login, /sign-in, /auth)? Flag as HIGH RISK unless the domain is a verified, top-tier global entity (e.g., google.com, microsoft.com).
        3. REDIRECTION RISK: Check if the URL structure suggests a "hop" or "redirect" (e.g., using 'url=' or 'dest=' parameters).
        4. LOOKALIKES: Apply strict homograph detection (e.g., 'pay-pal.com' vs 'paypal.com' or 'hbfc.com' vs 'hdfc.com', 'micros0ft.com' vs 'microsoft.com').
        5. CONTEXTUAL RELEVANCE: If the QR code is said to be from a known brand, does the URL domain match the official brand domain?


        OUTPUT FORMAT (JSON ONLY):
        {
        "risk": "LOW" | "MEDIUM" | "HIGH",
        "score": 0-100 (where 100 is safest),
        "reason": "Detailed explanation of red flags (e.g., 'Hidden redirect detected' or 'Impersonation of [Brand]')",
        "recommendation": "Actionable advice in 1-2 sentences"
        }

        QR CONTENT TO ANALYZE: "${content}"
    `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      throw new Error("Invalid JSON response from Gemini API");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * Extract QR code data from an image using Gemini Vision API
 * @param imageUri - Local file URI or base64 image data
 * @returns The QR code content as a string, or null if no QR code found
 */
export const extractQrCodeFromImage = async (imageUri: string): Promise<string | null> => {
  try {
    // Convert image URI to base64
    let imageBase64: string;
    let mimeType: string = 'image/jpeg';

    // Check if it's already base64
    if (imageUri.startsWith('data:image/')) {
      const parts = imageUri.split(',');
      mimeType = parts[0].split(';')[0].split(':')[1];
      imageBase64 = parts[1];
    } else {
      // For React Native/Expo, determine MIME type from URI extension
      if (imageUri.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      } else if (imageUri.toLowerCase().endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (imageUri.toLowerCase().endsWith('.webp')) {
        mimeType = 'image/webp';
      }

      // Fetch the image and convert to base64
      // Handle both file:// URIs (local) and http(s):// URIs (remote)
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Convert blob to base64 using a cross-platform compatible method
      imageBase64 = await new Promise<string>((resolve, reject) => {
        // Try using FileReader if available (web), otherwise use ArrayBuffer method
        if (typeof FileReader !== 'undefined') {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        } else {
          // For React Native, convert blob to array buffer then to base64
          blob.arrayBuffer().then(buffer => {
            // Convert ArrayBuffer to base64
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            // Use btoa if available, otherwise need polyfill
            if (typeof btoa !== 'undefined') {
              resolve(btoa(binary));
            } else {
              // Fallback: use Buffer if available (Node.js environment)
              if (typeof Buffer !== 'undefined') {
                resolve(Buffer.from(binary, 'binary').toString('base64'));
              } else {
                reject(new Error('No base64 encoding method available'));
              }
            }
          }).catch(reject);
        }
      });
    }

    const prompt = `
            Analyze this image and extract any QR code data.
            
            INSTRUCTIONS:
            1. Look for QR codes in the image
            2. If you find a QR code, extract ONLY the raw text/URL/data contained in it
            3. Return ONLY the extracted data, nothing else
            4. If no QR code is found, return "NO_QR_CODE_FOUND"
            5. Do not add any explanations, prefixes, or formatting - just return the raw QR code content
            
            Return format: Just the QR code content as plain text, or "NO_QR_CODE_FOUND" if none exists.
        `;

    const result = await visionModel.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text().trim();

    // Check if QR code was found
    if (!responseText || responseText === 'NO_QR_CODE_FOUND' || responseText.toLowerCase().includes('no qr code')) {
      return null;
    }

    // Clean up the response - remove any extra text that might have been added
    let qrData = responseText;

    // Remove common prefixes/suffixes that AI might add
    qrData = qrData.replace(/^(qr code:|qr code data:|extracted data:|data:)/i, '').trim();
    qrData = qrData.replace(/["']/g, ''); // Remove quotes

    // If it looks like the AI gave an explanation, try to extract just the URL/data
    // Look for URLs in the response
    const urlMatch = qrData.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      return urlMatch[0];
    }

    // If it's a short string (likely the QR data itself), return it
    if (qrData.length < 500) {
      return qrData;
    }

    return null;
  } catch (error) {
    console.error("Error extracting QR code from image:", error);
    throw error;
  }
};


export const analyzeAppSafety = async (appName: string, packageName: string, permissions: string[]) => {
  const systemInstruction = `
    ACT AS A SENIOR MOBILE SECURITY ANALYST. 
    YOUR OUTPUT MUST BE A JSON VERDICT. 
    CONSTRAINTS: 
    - NEVER explain what a permission is.
    - NEVER list safe permissions.
    - REASON direct in a few sentences sentence (MAX 50 WORDS).
    - FOCUS ONLY ON THE RED FLAGS.
  `;

  const prompt = `
    Analyze this APK:
    App: "${appName}"
    Package: "${packageName}"
    Permissions: ${JSON.stringify(permissions)}

    STRICT VERDICT FORMAT:
    {
      "risk": "HIGH" | "MEDIUM" | "LOW",
      "score": 0-100,
      "reason": "Just the security red flags in 1 to 2 sentences.",
    }

    EXAMPLES OF GOOD REASONS:
    - "Flashlight app requesting SMS and Location access is a high-risk data-harvesting pattern."
    - "Package name mismatch suggests a modded or fake version of a popular app."
        OUTPUT FORMAT (JSON ONLY):
        {
          "risk": "LOW" | "MEDIUM" | "HIGH",
          "score": 0-100 (where 100 is safest),
          "reason": "Security Verdict: MAX 30 WORDS. Direct and to the point.",
          "recommendation": "Actionable advice in 1-2 sentences.",
        }
    `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    if (!responseText) throw new Error("Empty response from Gemini");

    try {
      return JSON.parse(responseText);
    } catch (e) {
      // Fallback for markdown code block cleanup
      const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    }
  } catch (error) {
    console.log("Gemini App Analysis Error:", error);
    throw error;
  }
};