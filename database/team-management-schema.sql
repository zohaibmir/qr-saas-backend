-- ===============================================
-- TEAM MANAGEMENT SYSTEM SCHEMA
-- Phase 4A: Multi-user Organizations
-- ===============================================

-- Organizations/Teams table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    subscription_plan_id UUID REFERENCES subscription_plans(id),
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Team memberships with role-based access
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Team invitations system
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'viewer')),
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    accepted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- QR Codes team sharing (extend existing qr_codes table)
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS shared_with_team BOOLEAN DEFAULT false;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS team_permissions JSONB DEFAULT '{}';

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE is_active = true;

-- Member indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status) WHERE status = 'active';

-- Invitation indexes
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_expires ON organization_invitations(expires_at);

-- QR codes team sharing indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_organization_id ON qr_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_shared_team ON qr_codes(organization_id, shared_with_team) WHERE shared_with_team = true;

-- ===============================================
-- HELPER FUNCTIONS
-- ===============================================

-- Function to create organization with owner
CREATE OR REPLACE FUNCTION create_organization_with_owner(
    p_user_id UUID,
    p_org_name VARCHAR(255),
    p_org_slug VARCHAR(100),
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Create organization
    INSERT INTO organizations (name, slug, description, created_by)
    VALUES (p_org_name, p_org_slug, p_description, p_user_id)
    RETURNING id INTO v_org_id;
    
    -- Add creator as owner
    INSERT INTO organization_members (organization_id, user_id, role, status, accepted_at)
    VALUES (v_org_id, p_user_id, 'owner', 'active', NOW());
    
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check user permissions in organization
CREATE OR REPLACE FUNCTION check_organization_permission(
    p_user_id UUID,
    p_org_id UUID,
    p_required_role VARCHAR(50) DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_role_hierarchy INTEGER;
    v_required_hierarchy INTEGER;
BEGIN
    -- Get user role in organization
    SELECT role INTO v_user_role
    FROM organization_members
    WHERE organization_id = p_org_id 
      AND user_id = p_user_id 
      AND status = 'active';
    
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Role hierarchy: owner=4, admin=3, editor=2, viewer=1
    v_role_hierarchy := CASE v_user_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'editor' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    v_required_hierarchy := CASE p_required_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'editor' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    RETURN v_role_hierarchy >= v_required_hierarchy;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization stats
CREATE OR REPLACE FUNCTION get_organization_stats(p_org_id UUID)
RETURNS TABLE(
    total_members BIGINT,
    active_members BIGINT,
    pending_invitations BIGINT,
    total_qr_codes BIGINT,
    shared_qr_codes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM organization_members WHERE organization_id = p_org_id) as total_members,
        (SELECT COUNT(*) FROM organization_members WHERE organization_id = p_org_id AND status = 'active') as active_members,
        (SELECT COUNT(*) FROM organization_invitations WHERE organization_id = p_org_id AND accepted_at IS NULL AND expires_at > NOW()) as pending_invitations,
        (SELECT COUNT(*) FROM qr_codes WHERE organization_id = p_org_id) as total_qr_codes,
        (SELECT COUNT(*) FROM qr_codes WHERE organization_id = p_org_id AND shared_with_team = true) as shared_qr_codes;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM organization_invitations 
    WHERE expires_at < NOW() AND accepted_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;