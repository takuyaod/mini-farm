CREATE POLICY "owner can delete" ON plants
    FOR DELETE USING (created_by = auth.uid());
