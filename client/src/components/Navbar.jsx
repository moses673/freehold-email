export default function Navbar({ currentPage, onPageChange, user, onLogout }) {
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Freehold Email</h1>
        </div>

        <div className="flex gap-1 flex-1 justify-center">
          <button
            onClick={() => onPageChange('contacts')}
            className={`px-4 py-2 rounded-md transition ${
              currentPage === 'contacts'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Contacts
          </button>
          <button
            onClick={() => onPageChange('templates')}
            className={`px-4 py-2 rounded-md transition ${
              currentPage === 'templates'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => onPageChange('campaigns')}
            className={`px-4 py-2 rounded-md transition ${
              currentPage === 'campaigns'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => onPageChange('analytics')}
            className={`px-4 py-2 rounded-md transition ${
              currentPage === 'analytics'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => onPageChange('domains')}
            className={`px-4 py-2 rounded-md transition ${
              currentPage === 'domains'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Domain Setup
          </button>
          <button
            onClick={() => onPageChange('signups')}
            className={`px-4 py-2 rounded-md transition ${
              currentPage === 'signups'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Signups
          </button>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-600">
              {user.name || user.email}
            </span>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition text-sm font-medium"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
