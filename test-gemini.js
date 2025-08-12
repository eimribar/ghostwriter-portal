// Test Gemini API directly with LinkedIn prompt
const API_KEY = 'AIzaSyBf1vfywyUHLKs_SNAaiU1tvwhi2c0J7Ek';

// Using the first LinkedIn prompt template (RevOps & Technical Focus)
const systemMessage = `You are a writing agent whose sole responsibility is to craft high-performing, engaging, and thought-provoking LinkedIn posts based on a keyword, content idea, or brief that I will provide.

Your goal is to generate new posts that are pixel-perfect replicas — in voice, tone, structure, pacing, hook, and overall style — of the post examples provided here.

post examples:

post 1:

""Our RevOps AI is the least glamorous agent we're building. It might also be the one with the biggest impact on revenue.

It doesn't write copy. It doesn't design ads. It doesn't chat with prospects.

It just does the insanely valuable, tedious work that no one really wants to do:

- Connects our CRM, billing, and product usage data
- Flags accounts with low engagement 90 days before renewal
- Cleans and enriches lead data before it hits sales
- Automates our pipeline forecasting
- Finds upsell opportunities based on product usage patterns

The creative AIs get all the attention.

But the agent that just quietly makes the data trustworthy… that's the one that makes everything else possible."
"

POST 2:

"Why this is the GREATEST time to be building a software startup

1. Millions of people actually want to try new AI products 
2. Building software is way easier now
3. Anyone can go viral overnight (it's possible)
4. APIs turned everything into Lego blocks, you can build on top of Stripe, OpenAI, Twilio without rebuilding infrastructure 
5. Remote work makes it easier to find people to build with you
6. Agents/automation are making business making more efficient than ever
7. You don't need VC to get going 
8. The playing field has never been this leveled 

"BuT iT'S mOrE CoMpEtiTive ThAn EveR"

Yeah, more people are building. But most of it is pretty mid. It doesn't really address the pain point or it does it in a way that doesn't really speak to them. 

Competition has always existed. The difference is now you have the same tools as billion-dollar companies. Low barriers to entry cut both ways - yes more competitors can enter, but so can you.

"YoU mAkE it SoUnD So EaSY"

Building is easier. Building the RIGHT thing is still hard as heck.

Most people give up after month one when they realize coding was the easy part. Distribution, retention, finding product-market fit - that's where 99% fail.

The tools got better. The game didn't get easier.

But if you can push through the hard parts that eliminate most people...

You're competing in a market with infinite demand and the best building tools in history."

post 3: 

""Top reps can sell anything to anyone."

That's the biggest myth in sales.

The reality?

- Top performers disqualify faster than they qualify.
- They don't waste time on leads that don't fit their ICP
- They're maniacal about protecting their time
- They look for pain and dig deep to understand it
- If the buyer isn't a fit, they walk away—quickly
- They're obsessed with finding real problems to solve

The truth is, top reps aren't magic sellers.

They're just incredibly focused on who they spend their time with.

They don't waste energy chasing people who will never buy.

They look for strong signals and cut the rest.

If you're still trying to sell to everyone, 

you're selling to no one."

[REST OF PROMPT TRUNCATED FOR BREVITY - includes all guidelines about voice, disallowed terms, etc.]

ONLY PROVIDE THE LINKEDIN POST. NO EXPLANATIONS OR ANYTHING ELSE.

Content idea: ai agents`;

async function testGeminiAPI() {
  console.log('Testing Gemini 2.5 Pro API with LinkedIn prompt...\n');
  console.log('Topic: "ai agents"\n');
  console.log('---\n');

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemMessage,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            topK: 40,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error:', response.status, errorData);
      return;
    }

    const data = await response.json();
    console.log('Raw response:', JSON.stringify(data, null, 2));
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      console.log('\nGENERATED LINKEDIN POST:');
      console.log('========================\n');
      console.log(data.candidates[0].content.parts[0].text);
      console.log('\n========================');
      console.log('\nGeneration successful!');
    } else {
      console.error('No content generated:', data);
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
  }
}

testGeminiAPI();