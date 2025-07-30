-- Partner/Couple Question Packs
-- These packs will be available for partner turn mode

-- Insert Partner Question Packs
INSERT INTO packs (title, description, emoji, category, is_premium) VALUES
('Deep Talk', 'Meaningful conversations for couples', '💑', 'couple', false),
('Fun & Games', 'Lighthearted questions for partners', '🎮', 'couple', false),
('Romance & Intimacy', 'Romantic questions for couples', '💕', 'couple', false),
('Future Together', 'Questions about your future as a couple', '🌟', 'couple', false),
('Getting to Know You', 'Discover new things about your partner', '🔍', 'couple', false);

-- Insert Questions for "Deep Talk" Pack (ID: 1)
INSERT INTO questions (pack_id, question_text) VALUES
(1, 'What is your biggest fear about our relationship?'),
(1, 'What do you think is the most important quality in a partner?'),
(1, 'How do you handle stress, and how can I support you better?'),
(1, 'What is something you''ve always wanted to tell me but haven''t?'),
(1, 'What does love mean to you?'),
(1, 'What is your biggest dream for our future together?'),
(1, 'What is something you''re grateful for about our relationship?'),
(1, 'How do you think we''ve grown together as a couple?'),
(1, 'What is your biggest insecurity, and how can I help?'),
(1, 'What is the most meaningful thing someone has ever done for you?');

-- Insert Questions for "Fun & Games" Pack (ID: 2)
INSERT INTO questions (pack_id, question_text) VALUES
(2, 'If we could have any superpower together, what would you choose?'),
(2, 'What is the most embarrassing thing that has happened to you?'),
(2, 'If we were stranded on a desert island, what 3 things would you bring?'),
(2, 'What is your most irrational fear?'),
(2, 'If you could be any animal, what would you be and why?'),
(2, 'What is the weirdest food combination you actually enjoy?'),
(2, 'What is your most embarrassing guilty pleasure?'),
(2, 'If we could travel anywhere right now, where would you want to go?'),
(2, 'What is the most ridiculous thing you''ve ever done to impress someone?'),
(2, 'If you could have dinner with anyone, dead or alive, who would it be?');

-- Insert Questions for "Romance & Intimacy" Pack (ID: 3)
INSERT INTO questions (pack_id, question_text) VALUES
(3, 'What is your favorite way to be kissed?'),
(3, 'What is the most romantic thing someone has ever done for you?'),
(3, 'What is your love language?'),
(3, 'What is something that always makes you feel loved?'),
(3, 'What is your favorite memory of us together?'),
(3, 'What is something you find attractive about me that I might not know?'),
(3, 'What is your ideal date night?'),
(3, 'What is something you''d like me to do more often?'),
(3, 'What is your favorite thing about our physical intimacy?'),
(3, 'What is something romantic you''ve always wanted to try?');

-- Insert Questions for "Future Together" Pack (ID: 4)
INSERT INTO questions (pack_id, question_text) VALUES
(4, 'Where do you see us in 5 years?'),
(4, 'What is your biggest goal for our relationship?'),
(4, 'What is something you want to accomplish together?'),
(4, 'What is your dream home like?'),
(4, 'What is something you want to learn or improve about yourself?'),
(4, 'What is your biggest hope for our future?'),
(4, 'What is something you want to experience together?'),
(4, 'What is your biggest concern about our future?'),
(4, 'What is something you want to change or improve in our relationship?'),
(4, 'What is your biggest dream for our family?');

-- Insert Questions for "Getting to Know You" Pack (ID: 5)
INSERT INTO questions (pack_id, question_text) VALUES
(5, 'What is something about yourself that most people don''t know?'),
(5, 'What is your biggest pet peeve?'),
(5, 'What is your favorite childhood memory?'),
(5, 'What is something you''re passionate about that I might not know?'),
(5, 'What is your biggest regret?'),
(5, 'What is something you''ve always wanted to learn?'),
(5, 'What is your biggest accomplishment?'),
(5, 'What is something that always makes you laugh?'),
(5, 'What is your biggest challenge right now?'),
(5, 'What is something you''re looking forward to?');

-- Update existing packs to have couple category if needed
UPDATE packs SET category = 'couple' WHERE title ILIKE '%partner%' OR title ILIKE '%couple%'; 