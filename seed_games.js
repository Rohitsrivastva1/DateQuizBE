const db = require('./src/config/db');

const seedGames = async () => {
    try {
        console.log('🌱 Seeding Games...');

        // 1. Create Packs
        const packs = [
            {
                title: 'Truths',
                description: 'Honesty is the best policy. Answer truthfully!',
                emoji: '😇',
                category: 'Games',
                is_premium: false
            },
            {
                title: 'Dares',
                description: 'Feeling brave? Complete the challenge!',
                emoji: '😈',
                category: 'Games',
                is_premium: false
            },
            {
                title: 'Extreme Truths',
                description: 'Deep, intense, and revealing questions. 18+',
                emoji: '🔥',
                category: 'Extreme', // flagging as 'Extreme' for easy filtering
                is_premium: false
            },
            {
                title: 'Extreme Dares',
                description: ' bold, spicy, and adventurous challenges. 18+',
                emoji: '🌶️',
                category: 'Extreme', // flagging as 'Extreme'
                is_premium: false
            }
        ];

        for (const pack of packs) {
            // Check if pack exists
            const checkQuery = 'SELECT id FROM packs WHERE title = $1';
            const { rows } = await db.query(checkQuery, [pack.title]);

            let packId;
            if (rows.length > 0) {
                packId = rows[0].id;
                console.log(`Pack "${pack.title}" already exists (ID: ${packId})`);

                // Update category/description if needed for existing packs
                if (pack.category) {
                    await db.query('UPDATE packs SET category = $1, description = $2, emoji = $3 WHERE id = $4',
                        [pack.category, pack.description, pack.emoji, packId]);
                }

            } else {
                const insertQuery = `
                    INSERT INTO packs (title, description, emoji, category, is_premium)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
                `;
                const result = await db.query(insertQuery, [
                    pack.title,
                    pack.description,
                    pack.emoji,
                    pack.category,
                    pack.is_premium
                ]);
                packId = result.rows[0].id;
                console.log(`Created pack "${pack.title}" (ID: ${packId})`);
            }

            // 2. Add Questions
            let questions = [];

            if (pack.title === 'Truths') {
                questions = [
                    // Original
                    "What is your biggest fear?",
                    "What is the most embarrassing thing you've ever done?",
                    "Have you ever lied to your partner? If so, about what?",
                    "What is your biggest regret?",
                    "Who is your celebrity crush?",
                    "What is one thing you would change about yourself?",

                    // New Honest/Slightly Dangerous
                    "What was your first impression of me, honestly?",
                    "What do you miss the most when we’re not talking?",
                    "Have you ever reread our old chats? When?",
                    "What’s something you want from me but haven’t said directly?",
                    "What makes you feel most confident in this relationship?",
                    "What scares you a little about getting closer?",
                    "Which moment made you realize this isn’t “just casual”?",
                    "What habit of mine secretly annoys you—but you tolerate it?",
                    "If I disappeared for a week, what would you feel first?",
                    "What do you think we do really well as a couple?"
                ];
            } else if (pack.title === 'Dares') {
                questions = [
                    // Original
                    "Do 10 pushups.",
                    "Sing a song loudly.",
                    "Let your partner style your hair.",
                    "Talk in an accent for the next 5 minutes.",
                    "Dance without music for 1 minute.",

                    // New Safe/Flirty/Creative
                    "Send a 20-second voice note saying something you like about me—but you’re not allowed to use the words cute, love, or hot.",
                    "Describe your current mood about us using only emojis. No text explanations.",
                    "Set your WhatsApp/Instagram status to a single word that represents me for the next 1 hour.",
                    "Type a message starting with “If we were in the same room right now…” and stop mid-sentence. No finishing it.",
                    "Send one old photo (not spicy, just real) and explain why that moment still matters to you.",
                    "Share one song that secretly reminds you of me and tell exactly which line hits hardest.",
                    "I ask you 5 quick either-or questions (coffee/tea, night/morning, clingy/space, etc.)—you must answer instantly.",
                    "Save my contact with a new nickname of my choice for 24 hours.",
                    "Start typing… stop… start typing again… then send “never mind”.",
                    "Write one imaginative sentence about a perfect day together. Keep it classy."
                ];
            } else if (pack.title === 'Extreme Truths') {
                questions = [
                    "What about me attracts you before anything physical?",
                    "What kind of desire do you feel but rarely talk about?",
                    "Do you enjoy being wanted or being chased more?",
                    "What makes you feel sexually confident?",
                    "What’s your biggest insecurity when someone desires you?",
                    "What kind of attention from me lingers in your mind?",
                    "What part of intimacy feels most intense for you?",
                    "Do you open up slowly or all at once—and why?",
                    "What fantasy feels exciting but also intimidating?",
                    "When do you feel most attractive—alone or admired?",
                    "What reaction from me makes your heart race?",
                    "Do you prefer emotional buildup or instant chemistry?",
                    "What makes intimacy feel real rather than performative?",
                    "What do you crave more: closeness or tension?",
                    "What’s something you’ve wanted to say but held back?",
                    "What kind of words affect you the most?",
                    "When was the last time you felt deeply desired?",
                    "What makes you feel irresistible?",
                    "Do you enjoy subtle teasing or direct energy more?",
                    "What’s one desire you rarely admit?",
                    "What makes you feel safe enough to be bold?",
                    "Do you like anticipation or surprise more?",
                    "What part of connection excites you before anything else?",
                    "What makes flirting work for you?",
                    "What emotion intensifies attraction for you?",
                    "What kind of confidence turns you on?",
                    "Do you prefer leading or being guided?",
                    "What kind of intimacy feels the most personal?",
                    "What’s one boundary you value deeply?",
                    "What makes desire fade for you?",
                    "What kind of presence feels magnetic?",
                    "What moment of attraction do you replay mentally?",
                    "Do you enjoy mystery or clarity more?",
                    "What makes you feel emotionally exposed?",
                    "What kind of attention feels overwhelming—in a good way?",
                    "What makes you feel chosen?",
                    "What’s something you’re curious about but cautious of?",
                    "What part of yourself do you reveal only slowly?",
                    "What makes intimacy feel playful to you?",
                    "What makes it feel intense?",
                    "What kind of energy draws you in?",
                    "Do you prefer silence or words in close moments?",
                    "What makes you feel grounded during attraction?",
                    "What kind of desire feels most authentic?",
                    "What do you hope someone notices about you?",
                    "What makes you feel powerful in intimacy?",
                    "What kind of connection scares you a little?",
                    "What do you associate with deep attraction?",
                    "What feeling do you chase the most?",
                    "What do you secretly hope this game unlocks?"
                ];
            } else if (pack.title === 'Extreme Dares') {
                questions = [
                    "Send a voice note saying my name once, softly.",
                    "Type a sentence you’d only whisper.",
                    "Change into something that makes you feel confident and say “done.”",
                    "Write one word describing your current desire.",
                    "Stay silent on call for 30 seconds, then say “okay.”",
                    "Type “I almost said…” and stop.",
                    "Describe a moment you felt deeply wanted (no details).",
                    "Send a voice note taking one slow breath.",
                    "Write a sentence starting with “I like it when…”",
                    "Change my contact name to something bold for 1 hour.",
                    "Set a timer for 60 seconds and don’t speak until it ends.",
                    "Type three dots (…) and wait 20 seconds before replying.",
                    "Send a message you delete immediately, then say “almost.”",
                    "Write a compliment without using looks-based words.",
                    "Say one word that describes tonight’s energy.",
                    "Send a voice note saying “stop” and end it.",
                    "Describe how confidence feels in your body.",
                    "Text one sentence you’d never say in public.",
                    "Change your chat theme to something darker.",
                    "Write “Right now I want…” and finish it safely.",
                    "Pause typing for 15 seconds mid-message.",
                    "Send one emoji that represents desire for you.",
                    "Describe attraction using metaphor only.",
                    "Type a sentence starting with “I lose control when…”",
                    "Say one thing that makes you feel powerful.",
                    "Write a sentence that ends with “and that scares me.”",
                    "Stay quiet on call and let me talk for 30 seconds.",
                    "Send a voice note laughing softly, no words.",
                    "Write one boundary you value.",
                    "Text a line you’d only send at midnight.",
                    "Describe a moment you felt magnetic.",
                    "Change my nickname to something mysterious for an hour.",
                    "Type “Promise me you won’t judge…” and finish it.",
                    "Send one word you associate with intimacy.",
                    "Take 3 deep breaths and say “ready.”",
                    "Write a sentence starting with “I feel exposed when…”",
                    "Describe desire without using the word “want.”",
                    "Send a voice note saying “closer” once.",
                    "Type a sentence you hesitate before sending.",
                    "Write one word that feels dangerous—in a good way.",
                    "Pause the conversation for 1 minute intentionally.",
                    "Send a message that starts with “Tonight feels…”",
                    "Describe tension using only feelings.",
                    "Change your profile bio to one word for 30 minutes.",
                    "Type a sentence ending with “…for now.”",
                    "Send one emoji, then no message for 20 seconds.",
                    "Write what makes attraction fade for you.",
                    "Say one thing you’re curious about.",
                    "Type “this is harder than I thought.”",
                    "End your next message with “…”."
                ];
            }

            for (const qText of questions) {
                // Check if question exists
                const checkQ = 'SELECT id FROM questions WHERE pack_id = $1 AND question_text = $2';
                const { rows: qRows } = await db.query(checkQ, [packId, qText]);

                if (qRows.length === 0) {
                    await db.query('INSERT INTO questions (pack_id, question_text) VALUES ($1, $2)', [packId, qText]);
                    console.log(`  Added question to ${pack.title}: "${qText.substring(0, 30)}..."`);
                }
            }
        }

        console.log('✅ Games seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding games:', error);
        process.exit(1);
    }
};

seedGames();
