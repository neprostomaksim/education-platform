-- Historical migration: never promote all profiles. Administrator bootstrap must target an explicitly verified account.

-- Update the trigger function to allow backend/SQL editor updates!
CREATE OR REPLACE FUNCTION public.check_profile_update() RETURNS trigger AS $$
BEGIN
    -- Allow if it's the backend (auth.uid is null) OR if the user is an admin
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    ELSE
        -- Force the sensitive fields to remain unchanged for regular users
        NEW.role = OLD.role;
        NEW.is_approved = OLD.is_approved;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Existing trigger stays enabled throughout.
