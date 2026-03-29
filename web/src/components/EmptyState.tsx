import { useTranslation } from '../i18n';

export function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-dark-900)' }}>
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-dark-700 flex items-center justify-center">
          <svg className="w-10 h-10" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>{t('empty.selectChat')}</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{t('empty.orStartNew')}</p>
      </div>
    </div>
  );
}
