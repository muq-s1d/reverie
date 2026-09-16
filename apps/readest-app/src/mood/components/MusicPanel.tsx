// Settings → Music tab.
import { useEffect } from 'react';
import { BoxedList, SettingsRow, SettingsSwitchRow } from '@/components/settings/primitives';
import type { SettingsPanelPanelProp } from '@/components/settings/SettingsDialog';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_MUSIC_SETTINGS } from '../music';
import { saveMusicSettings, useMusicSettings } from '../musicSettings';

const MusicPanel: React.FC<SettingsPanelPanelProp> = ({ onRegisterReset }) => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const { enabled, volume, muted, tourDone } = useMusicSettings();
  const save = (patch: Parameters<typeof saveMusicSettings>[1]) =>
    saveMusicSettings(envConfig, patch);

  useEffect(() => {
    onRegisterReset(() => save(DEFAULT_MUSIC_SETTINGS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='my-4 w-full space-y-6'>
      <BoxedList title={_('Mood Music')} data-setting-id='settings.music.main'>
        <SettingsSwitchRow
          label={_('Play mood music')}
          description={_('Music that follows the mood of EPUB and PDF books')}
          checked={enabled}
          onChange={() => save({ enabled: !enabled })}
          data-setting-id='settings.music.enabled'
        />
        <SettingsRow label={_('Volume')} disabled={!enabled}>
          <div className='flex items-center gap-2'>
            <input
              type='range'
              className='range range-sm eink-bordered'
              min={0}
              max={100}
              step={5}
              value={Math.round(volume * 100)}
              disabled={!enabled}
              aria-label={_('Music volume')}
              // ponytail: saves on every slider step; settings.json is small. Debounce if it shows up.
              onChange={(e) => save({ volume: Number(e.target.value) / 100 })}
              data-setting-id='settings.music.volume'
            />
            <span className='text-base-content/70 w-9 text-end text-sm tabular-nums'>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </SettingsRow>
        <SettingsSwitchRow
          label={_('Mute')}
          description={_('Keep the music on but silent')}
          checked={muted}
          disabled={!enabled}
          onChange={() => save({ muted: !muted })}
          data-setting-id='settings.music.muted'
        />
      </BoxedList>
      <BoxedList title={_('Help')} data-setting-id='settings.music.help'>
        <SettingsRow
          label={_('Mood tour')}
          description={_('Shows how mood music works next time you open a book')}
          asLabel={false}
        >
          <button
            className='btn btn-ghost btn-sm eink-bordered'
            disabled={!tourDone}
            onClick={() => save({ tourDone: false })}
          >
            {tourDone ? _('Show tour again') : _('Will show')}
          </button>
        </SettingsRow>
      </BoxedList>
    </div>
  );
};

export default MusicPanel;
