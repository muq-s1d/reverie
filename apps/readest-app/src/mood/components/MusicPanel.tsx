// Settings → Music tab: on/off, volume, mute; per-mood track pages; tour reset.
import { useEffect, useState } from 'react';
import { MdPlayArrow, MdStop } from 'react-icons/md';
import { Toggle } from '@/components/primitives/toggle';
import {
  BoxedList,
  NavigationRow,
  SettingsRow,
  SettingsSwitchRow,
} from '@/components/settings/primitives';
import type { SettingsPanelPanelProp } from '@/components/settings/SettingsDialog';
import SubPageHeader from '@/components/settings/SubPageHeader';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { isTauriAppPlatform } from '@/services/environment';
import { MOODS, type Mood } from '../moods';
import {
  builtInTracks,
  DEFAULT_MUSIC_SETTINGS,
  isBuiltInTrack,
  type MusicSettings,
  moodTracks,
  trackInfo,
} from '../music';
import { AUDIO_EXTENSIONS, saveMusicSettings, useMusicSettings } from '../musicSettings';
import { stopPreview, togglePreview, usePreviewStore } from '../preview';
import { MoodIconStyles, moodIcon } from './MoodIcon';

const MusicPanel: React.FC<SettingsPanelPanelProp> = ({ onRegisterReset }) => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const settings = useMusicSettings();
  const { enabled, volume, muted, tourDone, disabledTracks } = settings;
  const [openMood, setOpenMood] = useState<Mood | null>(null);
  const save = (patch: Partial<MusicSettings>) => saveMusicSettings(envConfig, patch);

  useEffect(() => {
    onRegisterReset(() => save(DEFAULT_MUSIC_SETTINGS));
    return stopPreview; // leaving the tab stops any preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (openMood) {
    return <MoodTracksPage mood={openMood} onBack={() => setOpenMood(null)} />;
  }

  return (
    <div className='my-4 w-full space-y-6'>
      <MoodIconStyles />
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

      <BoxedList
        title={_('Tracks')}
        description={_('Listen to tracks, switch them on or off, or add your own songs.')}
        data-setting-id='settings.music.tracks'
      >
        {MOODS.map((mood) => {
          const all = moodTracks(mood, settings);
          const on = all.filter((t) => !disabledTracks.includes(t)).length;
          const yours = all.length - builtInTracks(mood).length;
          const status = yours
            ? _('{{on}} of {{total}} on · {{yours}} yours', { on, total: all.length, yours })
            : _('{{on}} of {{total}} on', { on, total: all.length });
          return (
            <NavigationRow
              key={mood}
              icon={moodIcon(mood)}
              title={_(mood)}
              status={status}
              onClick={() => setOpenMood(mood)}
            />
          );
        })}
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

const MoodTracksPage = ({ mood, onBack }: { mood: Mood; onBack: () => void }) => {
  const _ = useTranslation();
  const { envConfig, appService } = useEnv();
  const { disabledTracks, userTracks } = useMusicSettings();
  const playing = usePreviewStore((s) => s.playing);
  const save = (patch: Partial<MusicSettings>) => saveMusicSettings(envConfig, patch);
  const yours = userTracks[mood] ?? [];

  const setOn = (id: string, on: boolean) =>
    save({
      disabledTracks: on ? disabledTracks.filter((t) => t !== id) : [...disabledTracks, id],
    });

  const addSongs = async () => {
    // Readest's picker also grants the app read access to the chosen files (kept across restarts).
    const files = (await appService?.selectFiles(_('Audio'), AUDIO_EXTENSIONS)) ?? [];
    const added = files.filter((f) => !yours.includes(f));
    if (added.length) await save({ userTracks: { ...userTracks, [mood]: [...yours, ...added] } });
  };

  // Removes the song from Reverie only; the file stays on the computer.
  const remove = (id: string) => {
    if (playing === id) stopPreview();
    return save({
      userTracks: { ...userTracks, [mood]: yours.filter((t) => t !== id) },
      disabledTracks: disabledTracks.filter((t) => t !== id),
    });
  };

  const row = (id: string) => {
    const { title: label, artist } = trackInfo(id);
    return (
      <SettingsRow
        key={id}
        asLabel={false}
        label={
          <span className='flex min-w-0 items-center gap-2'>
            <button
              className='btn btn-ghost btn-circle btn-sm eink-bordered shrink-0'
              aria-label={
                playing === id ? _('Stop preview') : _('Preview {{name}}', { name: label })
              }
              onClick={() => togglePreview(id)}
            >
              {playing === id ? <MdStop size={18} /> : <MdPlayArrow size={18} />}
            </button>
            <span className='min-w-0'>
              <span className='block truncate'>{label}</span>
              {artist && (
                <span className='text-base-content/60 block truncate text-xs'>
                  {artist} · CC-BY 4.0
                </span>
              )}
            </span>
          </span>
        }
      >
        <div className='flex items-center gap-2'>
          {!isBuiltInTrack(id) && (
            <button className='btn btn-ghost btn-sm' onClick={() => remove(id)}>
              {_('Remove')}
            </button>
          )}
          <Toggle
            checked={!disabledTracks.includes(id)}
            aria-label={_('Play {{name}}', { name: label })}
            onChange={(e) => setOn(id, e.target.checked)}
          />
        </div>
      </SettingsRow>
    );
  };

  return (
    <div className='my-4 w-full space-y-6'>
      <SubPageHeader
        parentLabel={_('Music')}
        currentLabel={_(mood)}
        description={_(
          'Every switched-on track can play for this mood. With all off, Neutral tracks play instead.',
        )}
        onBack={() => {
          stopPreview();
          onBack();
        }}
      />
      <BoxedList title={_('Built-in tracks')}>{builtInTracks(mood).map((id) => row(id))}</BoxedList>
      {isTauriAppPlatform() && (
        <BoxedList
          title={_('Your songs')}
          description={_(
            'Removing a song only takes it out of Reverie. The file stays on your computer.',
          )}
        >
          {yours.map((id) => row(id))}
          <SettingsRow label={_('Add your own songs to this mood')} asLabel={false}>
            <button className='btn btn-ghost btn-sm eink-bordered' onClick={addSongs}>
              {_('Add songs…')}
            </button>
          </SettingsRow>
        </BoxedList>
      )}
    </div>
  );
};

export default MusicPanel;
