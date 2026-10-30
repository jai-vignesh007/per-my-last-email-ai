# Per My Last Email

A corporate jargon and LinkedIn humblebrag translator with four modes:
decode an email, make it corporate, decode a LinkedIn post, and make it LinkedIn.

- **Highlighted translation** runs instantly in the visitor's browser, for free, forever.
- **Smart translation with AI** sends the text to Google's Gemini (free tier)
  through a tiny serverless function that keeps your API key secret.

## Files

```
per-my-last-email/
├── index.html                    Page structure
├── favicon.svg                   Tab icon
├── netlify.toml                  Tells Netlify where the site and function live
├── .env.example                  Template for local testing
├── .gitignore                    Keeps your .env (and key) out of GitHub
├── css/styles.css                Styling, including dark mode
├── js/dictionaries.js            Every phrase, example and LinkedIn template
├── js/app.js                     Page behaviour and the smart button
└── netlify/functions/
    └── translate.mjs             The server: hides the key, limits abuse
```

## Step 1: Get a free Gemini API key

1. Go to https://aistudio.google.com and sign in with a Google account.
2. Click **Get API key**, then **Create API key**. Copy it.
3. **Do not add a billing account to this project.** Without billing, Google
   can only ever serve you the free tier, so you can't be charged. When the
   free daily limit runs out, smart translation pauses until it resets and the
   highlighted version keeps working.

## Step 2: Put the code on GitHub

1. Create a free account at https://github.com and click **New repository**.
2. Name it (for example `per-my-last-email`) and create it.
3. Click **uploading an existing file** and drag in everything *inside* this
   folder, including the `netlify` folder and `netlify.toml`.
   (Hidden files like `.gitignore` may need "Show hidden files" turned on.)
4. Commit the files.

## Step 3: Deploy on Netlify

Netlify Drop (drag-and-drop) only hosts static files and won't run the
function, so connect GitHub instead:

1. Go to https://app.netlify.com, sign up free with your GitHub account.
2. **Add new site → Import an existing project → GitHub**, and pick your repository.
3. Leave the build command empty. Publish directory is `.` (already set in `netlify.toml`).
4. Before deploying, open **Environment variables** (or after: Site configuration →
   Environment variables) and add:
   - Key: `GEMINI_API_KEY`
   - Value: the key from Step 1
5. Click **Deploy**. If you added the key after the first deploy, go to
   **Deploys → Trigger deploy** so the function picks it up.

Your site is live at `something.netlify.app`. Rename it under
Site configuration → Change site name. Every time you change a file on GitHub,
Netlify redeploys automatically.

## Changing the AI model

The function uses `gemini-flash-lite-latest` by default. Google renames and
retires models over time, so if smart translation ever stops working, check
which models are free in Google AI Studio and add an environment variable
`GEMINI_MODEL` with that model's name, then redeploy.

## Testing on your own computer (optional)

Opening `index.html` directly works for the highlighted modes, but the smart
button needs the function. To test everything locally, install Node.js, then:

```
cp .env.example .env      # then paste your key into .env
npx netlify-cli dev
```

## Abuse protection built in

- Only the four translator jobs are allowed, so nobody can use your key as a
  general chatbot.
- Input is capped at 2,000 characters.
- Each visitor gets about 10 smart translations per 10 minutes.
- Without billing on your Google project, the worst case is that the free
  quota runs out for the day. It never costs money.

## Privacy note

On Gemini's free tier, Google may use the text sent to it to improve its
products, and human reviewers may read it. The page footer tells visitors not
to paste anything confidential into smart translation.

## Add your own phrases

Open `js/dictionaries.js` and add a line to the right list:

```js
["phrase to find", "what it really means"],
```

`DECODE` (email → honest), `CORP` (honest → corporate), `LDECODE`
(LinkedIn → honest), `LPOST` (honest → LinkedIn). Longer phrases win over
shorter ones, and capitalisation doesn't matter.
