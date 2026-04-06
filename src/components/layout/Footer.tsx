import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#059669" />
                <path d="M7 10h3l3.5 9.5L17 12l3.5 7.5L24 10h3l-5.5 14h-2.5L16 17l-3 7H10.5L7 10z" fill="white" />
              </svg>
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">WhenMeets</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              쉽고 빠른 그룹 일정 조율.
              <br />
              무료, 오픈소스.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Links</h3>
            <div className="flex flex-col gap-2">
              <a
                href="https://github.com/BORB-CHOI/whenmeets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                GitHub
              </a>
              <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                피드백
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Legal</h3>
            <div className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                개인정보처리방침
              </Link>
              <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                이용약관
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
          © {new Date().getFullYear()} WhenMeets. Open source under MIT license.
        </div>
      </div>
    </footer>
  );
}
