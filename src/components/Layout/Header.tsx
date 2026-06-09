import { useState } from 'react';
import { Menu, Moon, Sun, Bell, User, LogOut, ChevronDown } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { getRoleLabel } from '../../utils/format';
import { logout as apiLogout } from '../../api/auth';

export default function Header() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore();
  const { userInfo, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <header className="h-16 bg-bg-card border-b border-border-color flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          <Menu size={20} />
        </button>
        <nav className="hidden md:flex items-center gap-2 text-sm text-text-secondary">
          <span className="text-text-muted">首页</span>
          <span>/</span>
          <span className="text-cyan-light">仪表盘</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button className="relative p-2 rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-cyan to-primary rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-text-primary">
                {userInfo?.realName || userInfo?.username}
              </div>
              <div className="text-xs text-text-muted">
                {userInfo?.role && getRoleLabel(userInfo.role)}
              </div>
            </div>
            <ChevronDown size={16} className="text-text-muted" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-bg-card border border-border-color rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-2">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                >
                  <User size={16} />
                  个人信息
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-red hover:bg-red/10 hover:text-red transition-colors"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
