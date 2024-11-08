import {
  ActionFunction,
  HeadersFunction,
  json,
  LoaderFunction,
  redirect,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation
} from "@remix-run/react";
import { useState } from "react";
import { createPlaylist } from "~/utils/db.server";
import { ReCAPTCHA } from "react-google-recaptcha";

export const headers: HeadersFunction = () => {
  return {
    "Cache-Control": "max-age=604800, stale-while-revalidate=86400",
  };
};

async function validateHuman(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET;
  const response = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
    {
      method: "POST",
    }
  );
  const data = await response.json();
  return data.success;
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const token = formData.get("token") as string;

  const human = await validateHuman(token);
  if (!human) {
    return json({ message: "Bot detected. Unauthorized" }, { status: 401 });
  }

  const playlistUrl = formData.get("playlistUrl") as string;
  if (!playlistUrl || !playlistUrl.includes("youtube.com/playlist?list=")) {
    return json(
      { message: "Please Provide a valid Playlist URL" },
      { status: 400 }
    );
  }

  const urlParams = new URLSearchParams(playlistUrl.split("?").pop());
  const id = urlParams.get("list");

  if (id !== null) {
    const gamePlaylist = await createPlaylist(id);
    return redirect(`/success/${gamePlaylist.id}`);
  }
  return json(
    { message: "Invalid Playlist URL. Remember Playlist URL must be Public." },
    { status: 400 }
  );
};

export const loader: LoaderFunction = async () => {
  return {
    RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
  };
};

export default function NewPlaylist() {
  const data = useLoaderData<typeof loader>();
  const [input, setInput] = useState("");
  const error = useActionData<typeof action>();
  const [token, setToken] = useState("");
  const navigation = useNavigation();

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-white w-11/12 max-w-2xl p-6 md:p-10 rounded-lg">
        <h1 className="text-3xl sm:text-4xl text-center font-extrabold mb-2 text-black">
          Custom Playlist
        </h1>
        <p className="text-lg sm:text-xl text-center mb-12 text-black">
          Create a custom game from any public Youtube Playlist
        </p>
        <Form className="flex flex-col gap-4 text-lg" method="post">
          <label htmlFor="playlistUrl" className="text-black">Playlist URL</label>
          <input
            className="flex-1 border-b-2 border-gray-400 p-2 bg-white text-black"
            type="text"
            id="playlistUrl"
            name="playlistUrl"
            placeholder="https://www.youtube.com/playlist?list=..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
          />
          {error && <span className="text-red-500">{error.message}</span>}
          <ReCAPTCHA
            style={{ display: "inline-block", width: 304 }}
            className="self-center"
            sitekey={data.RECAPTCHA_SITE_KEY}
            onChange={(val) => setToken(val as string)}
          />
          <input type="hidden" name="token" value={token} />
          <button
            className="py-4 rounded bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={input === "" || navigation.state !== "idle"}
          >
            {navigation.state === "idle" ? "Submit" : navigation.state}
          </button>
        </Form>
      </div>
    </div>
  );
}
