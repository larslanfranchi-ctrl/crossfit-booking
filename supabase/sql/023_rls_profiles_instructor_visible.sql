-- Kursleiter-Profile (nur diese) für alle authentifizierten Nutzer lesbar,
-- damit der Name auf der Termin-Detailseite angezeigt werden kann, ohne die
-- bestehende restriktive profiles-RLS für normale Profile (Telefonnummer!)
-- aufzuweichen.
CREATE POLICY "Authenticated users can view instructor profiles"
ON profiles FOR SELECT TO authenticated
USING (role = 'instructor');
