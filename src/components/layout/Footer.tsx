import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center text-white text-xs font-extrabold">
                W
              </div>
              <span className="text-base font-bold text-gray-900">WhenMeets</span>
            </div>
            <p className="text-sm text-gray-500">
              쉽고 빠른 그룹 일정 조율.
              <br />
              무료, 오픈소스.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Links</h3>
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com/BORB-CHOI/whenmeets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                GitHub
              </a>
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                피드백
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Legal</h3>
            <div className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                개인정보처리방침
              </Link>
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                이용약관
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-400">
          © {new Date().getFullYear()} WhenMeets. Open source under MIT license.
        </div>
      </div>
    </footer>
  );
}
