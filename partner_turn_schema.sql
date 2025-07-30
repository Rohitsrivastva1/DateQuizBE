-- Partner Turn Questions Table
-- This table stores partner turn-based questions and their answers

CREATE TABLE IF NOT EXISTS partner_turn_questions (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    deck_id INTEGER NOT NULL REFERENCES packs(id),
    requester_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting_receiver' CHECK (status IN ('waiting_requester', 'waiting_receiver', 'complete')),
    answers JSONB NOT NULL DEFAULT '{}',
    notifications_sent JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_partner_turn_requester ON partner_turn_questions(requester_id);
CREATE INDEX IF NOT EXISTS idx_partner_turn_receiver ON partner_turn_questions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_partner_turn_status ON partner_turn_questions(status);
CREATE INDEX IF NOT EXISTS idx_partner_turn_created ON partner_turn_questions(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_partner_turn_updated_at 
    BEFORE UPDATE ON partner_turn_questions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Example data structure for answers JSONB:
-- {
--   "1": {"text": "Cuddles", "timestamp": "2025-01-27T10:30:00Z"},
--   "2": {"text": "Netflix", "timestamp": "2025-01-27T10:35:00Z"}
-- }

-- Example data structure for notifications_sent JSONB:
-- {
--   "1": true,
--   "2": false
-- } 