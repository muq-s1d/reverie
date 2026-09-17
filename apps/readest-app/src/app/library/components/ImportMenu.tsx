import clsx from 'clsx';
import { MdLanguage, MdMenuBook, MdRssFeed } from 'react-icons/md';
import { LuLibrary } from 'react-icons/lu';
import { IoFileTray } from 'react-icons/io5';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import MenuItem from '@/components/MenuItem';
import { isOfflineBuild } from '@/reverie/offline';
import Menu from '@/components/Menu';

export interface ImportMenuProps {
  menuClassName?: string;
  setIsDropdownOpen?: (open: boolean) => void;
  onImportBooksFromFiles: () => void;
  onImportBooksFromDirectory?: () => void;
  onImportFromWebBrowser?: () => void;
  onImportBookFromNovelUrl?: () => void;
  onOpenCatalogManager: () => void;
  onOpenFeeds: () => void;
}

const ImportMenu: React.FC<ImportMenuProps> = ({
  menuClassName,
  setIsDropdownOpen,
  onImportBooksFromFiles,
  onImportBooksFromDirectory,
  onImportFromWebBrowser,
  onImportBookFromNovelUrl,
  onOpenCatalogManager,
  onOpenFeeds,
}) => {
  const _ = useTranslation();
  const { appService } = useEnv();

  const handleImportFromFiles = () => {
    onImportBooksFromFiles();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromDirectory = () => {
    onImportBooksFromDirectory?.();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromWebBrowser = () => {
    onImportFromWebBrowser?.();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromNovelUrl = () => {
    onImportBookFromNovelUrl?.();
    setIsDropdownOpen?.(false);
  };

  const handleOpenCatalogManager = () => {
    onOpenCatalogManager();
    setIsDropdownOpen?.(false);
  };

  const handleOpenFeeds = () => {
    onOpenFeeds();
    setIsDropdownOpen?.(false);
  };

  // Reverie: web/feed/catalog imports need the internet; they render nothing in the offline build.
  const OnlineMenuItem = isOfflineBuild() ? () => null : MenuItem;

  return (
    <Menu
      className={clsx(
        'dropdown-content bg-base-100 rounded-box relative! z-[1] mt-3 p-2 shadow-sm',
        menuClassName,
      )}
      onCancel={() => setIsDropdownOpen?.(false)}
    >
      <MenuItem
        label={_('From Local File')}
        Icon={<IoFileTray className='h-5 w-5' />}
        onClick={handleImportFromFiles}
      />
      {onImportBooksFromDirectory && (
        <MenuItem
          label={_('From Directory')}
          Icon={<IoFileTray className='h-5 w-5' />}
          onClick={handleImportFromDirectory}
        />
      )}
      <hr
        aria-hidden='true'
        className={`border-base-200 my-1 ${isOfflineBuild() ? 'hidden' : ''}`}
      />
      {onImportFromWebBrowser && (
        <OnlineMenuItem
          label={_('From Web Browser')}
          Icon={<MdLanguage className='h-5 w-5' />}
          onClick={handleImportFromWebBrowser}
        />
      )}
      {onImportBookFromNovelUrl && (
        <OnlineMenuItem
          label={_('From Web Novel')}
          Icon={<MdMenuBook className='h-5 w-5' />}
          onClick={handleImportFromNovelUrl}
        />
      )}
      <OnlineMenuItem
        label={_('From Feed URL')}
        Icon={<MdRssFeed className='h-5 w-5' />}
        onClick={handleOpenFeeds}
      />
      <OnlineMenuItem
        label={appService?.isOnlineCatalogsAccessible ? _('Online Library') : _('OPDS Catalogs')}
        Icon={<LuLibrary className='h-5 w-5' />}
        onClick={handleOpenCatalogManager}
      />
    </Menu>
  );
};

export default ImportMenu;
