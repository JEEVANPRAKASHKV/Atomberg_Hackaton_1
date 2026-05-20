-- ── 09_shared_goal_and_audit_triggers.sql ──────────────────────────
-- This migration adds triggers for Shared Goals sync and Audit Trail logging.

-- 1. Shared Goal Check-ins Sync Trigger
-- Automatically syncs check-in progress from a 'source' shared goal to all recipient child goals.
CREATE OR REPLACE FUNCTION public.sync_shared_goal_checkins()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.hr_goal_checkins (
        goal_id,
        employee_id,
        quarter,
        actual_value,
        actual_date,
        progress_status,
        computed_score,
        submitted_at,
        updated_at
    )
    SELECT
        g.id AS goal_id,
        g.employee_id,
        NEW.quarter,
        NEW.actual_value,
        NEW.actual_date,
        NEW.progress_status,
        NEW.computed_score,
        NEW.submitted_at,
        NEW.updated_at
    FROM public.hr_goals g
    WHERE g.shared_goal_id = NEW.goal_id
    ON CONFLICT (goal_id, quarter)
    DO UPDATE SET
        actual_value = EXCLUDED.actual_value,
        actual_date = EXCLUDED.actual_date,
        progress_status = EXCLUDED.progress_status,
        computed_score = EXCLUDED.computed_score,
        updated_at = EXCLUDED.updated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_shared_goal_checkins ON public.hr_goal_checkins;
CREATE TRIGGER trg_sync_shared_goal_checkins
AFTER INSERT OR UPDATE ON public.hr_goal_checkins
FOR EACH ROW
EXECUTE FUNCTION public.sync_shared_goal_checkins();

-- 2. Audit Trail Trigger for hr_goals
-- Logs changes to goals (target_value, weightage, target_date) if the goal sheet is already locked.
CREATE OR REPLACE FUNCTION public.log_goal_edits()
RETURNS TRIGGER AS $$
DECLARE
    sheet_locked BOOLEAN;
    v_changed_by UUID;
BEGIN
    -- Check if the goal sheet is locked
    SELECT is_locked INTO sheet_locked FROM public.hr_goal_sheets WHERE id = NEW.goal_sheet_id;
    IF NOT COALESCE(sheet_locked, FALSE) THEN
        RETURN NEW;
    END IF;

    -- Get the employee_id of the user making the change
    SELECT id INTO v_changed_by FROM public.hr_employees WHERE user_id = auth.uid();
    IF v_changed_by IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Log target_value changes
    IF NEW.target_value IS DISTINCT FROM OLD.target_value THEN
        INSERT INTO public.hr_goal_audit_log (goal_id, changed_by, change_type, field_changed, old_value, new_value)
        VALUES (NEW.id, v_changed_by, 'edit', 'target_value', OLD.target_value::text, NEW.target_value::text);
    END IF;

    -- Log weightage changes
    IF NEW.weightage IS DISTINCT FROM OLD.weightage THEN
        INSERT INTO public.hr_goal_audit_log (goal_id, changed_by, change_type, field_changed, old_value, new_value)
        VALUES (NEW.id, v_changed_by, 'edit', 'weightage', OLD.weightage::text, NEW.weightage::text);
    END IF;

    -- Log target_date changes
    IF NEW.target_date IS DISTINCT FROM OLD.target_date THEN
        INSERT INTO public.hr_goal_audit_log (goal_id, changed_by, change_type, field_changed, old_value, new_value)
        VALUES (NEW.id, v_changed_by, 'edit', 'target_date', OLD.target_date::text, NEW.target_date::text);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_goal_edits ON public.hr_goals;
CREATE TRIGGER trg_log_goal_edits
AFTER UPDATE ON public.hr_goals
FOR EACH ROW
EXECUTE FUNCTION public.log_goal_edits();
