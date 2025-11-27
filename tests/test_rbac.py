def test_rbac_permissions():
    from core.user import rbac
    r = rbac.RBAC()
    assert r.has_permission('admin', 'manage_users')
    assert not r.has_permission('user', 'manage_users')
    assert r.has_permission('auditor', 'view_reports')
    assert not r.has_permission('user', 'export_data')

def test_authenticate():
    from core.user import rbac
    assert rbac.authenticate('admin', 'adminpw') == 'admin'
    assert rbac.authenticate('user', 'userpw') == 'user'
    assert not rbac.authenticate('admin', 'wrongpw')
    assert not rbac.authenticate('ghost', 'pw')
    # 2FA
    assert rbac.authenticate('admin', 'adminpw', otp='123456') == 'admin'
    assert not rbac.authenticate('admin', 'adminpw', otp='000000')
