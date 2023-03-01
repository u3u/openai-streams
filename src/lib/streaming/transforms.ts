import { Transform } from "yield-stream";
import { ENCODER, DECODER } from "../../globs/shared";

/**
 * Parse the first text choice from an OpenAI API response. It may be stored on
 * result.choices[0].text or now, result.choices[0].message for Chat.
 */
export const getTokensFromResponse = (response: any) => {
  // console.log(JSON.stringify(response, null, 2));
  const firstResponse = response?.choices?.[0];
  if (!firstResponse) {
    throw new Error("No choices received from OpenAI");
  }

  const text = firstResponse?.text ?? firstResponse?.message;
  if (typeof text !== "string") {
    throw new Error("No text response received from OpenAI");
  }

  return text;
};

/**
 * A transformer that receives chunks of parsed server sent events from OpenAI
 * and yields the delta of the first choice.
 */
export const ChatParser: Transform = async function* (chunk) {
  const decoded = DECODER.decode(chunk);
  const response = JSON.parse(decoded);
  const firstResult = response?.choices?.[0];
  const delta = firstResult?.delta;

  if (typeof delta !== "object") {
    throw new Error("Received invalid delta from OpenAI in ChatParser.");
  }

  const serialized = JSON.stringify(delta);
  yield ENCODER.encode(serialized);
};

/**
 * A transformer that receives chunks of parsed server sent events from OpenAI
 * and yields the text of the first choice.
 */
export const TokenParser: Transform = async function* (chunk) {
  const decoded = DECODER.decode(chunk);
  const response = JSON.parse(decoded);
  const tokens = getTokensFromResponse(response);

  yield ENCODER.encode(tokens);
};

/**
 * A transformer that receives chunks of parsed server sent events from OpenAI
 * and yields the JSON of the first choice's logprobs.
 */
export const LogprobsParser: Transform = async function* (chunk) {
  const ENCODER = new TextEncoder();
  const DECODER = new TextDecoder();

  const decoded = DECODER.decode(chunk);
  const message = JSON.parse(decoded);

  const { logprobs } = message?.choices?.[0];
  if (!logprobs) {
    return;
  }

  yield ENCODER.encode(JSON.stringify(logprobs));
};