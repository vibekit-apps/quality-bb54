import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';

type VideoDraft = {
  title: string;
  duration: string;
  format: string;
  quality: string;
  source: string;
  uri?: string;
};

type SuggestionResponse = {
  caption: string;
  hashtags: string[];
  hook: string;
  exportNote: string;
};

type RenderSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  signature: string;
};

const steps = ['Video Picker', 'Quality Enhance', 'Format & Export', 'Caption Builder', 'Export Options'] as const;

const sampleVideos: VideoDraft[] = [
  { title: 'Glow-up transition', duration: '00:18', format: 'MP4', quality: '720p', source: 'Camera Roll' },
  { title: 'Street fit reveal', duration: '00:27', format: 'MOV', quality: '1080p', source: 'Downloads' },
  { title: 'Product close-up', duration: '00:12', format: 'MP4', quality: '4K', source: 'Files' },
];

export default function Home() {
  const [step, setStep] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoDraft | null>(sampleVideos[0]);
  const [videoName, setVideoName] = useState(sampleVideos[0].title);
  const [manualSource, setManualSource] = useState('');
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [sharpness, setSharpness] = useState(78);
  const [clarity, setClarity] = useState(82);
  const [noiseReduction, setNoiseReduction] = useState(64);
  const [cropMode, setCropMode] = useState<'Original' | '9:16' | '1:1' | '16:9'>('Original');
  const [exportFormat, setExportFormat] = useState<'TikTok MP4' | 'High Bitrate MOV'>('TikTok MP4');
  const [fps, setFps] = useState<'30 FPS' | '60 FPS'>('30 FPS');
  const [resolution, setResolution] = useState<'1080p' | '4K'>('1080p');
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [renderStatus, setRenderStatus] = useState('Not queued yet. Choose your final export settings, then add this video to the render queue.');
  const [renderQueued, setRenderQueued] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const completion = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  const currentVideo: VideoDraft = selectedVideo || {
    title: videoName.trim() || 'Untitled clip',
    duration: '00:15',
    format: 'MP4',
    quality: resolution,
    source: manualSource.trim() || 'Manual import',
  };

  const updateVideoFromManual = () => {
    const title = videoName.trim() || 'Untitled clip';
    setSelectedVideo({ title, duration: '00:15', format: 'MP4', quality: resolution, source: manualSource.trim() || 'Manual import' });
    setError('');
  };

  const pickVideo = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow Photos access in iPhone Settings to select a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const totalSeconds = Math.max(0, Math.round((asset.duration || 0) / 1000));
    const duration = totalSeconds ? `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}` : 'Video';
    const title = asset.fileName?.replace(/\.[^.]+$/, '') || 'Selected video';
    const format = asset.mimeType?.split('/')[1]?.toUpperCase() || 'VIDEO';
    const picked = { title, duration, format, quality: resolution, source: 'iPhone Photos', uri: asset.uri };
    setSelectedVideo(picked);
    setVideoName(title);
    setManualSource('iPhone Photos');
  };

  const buildCaptions = async () => {
    setLoadingSuggestions(true);
    setError('');
    try {
      const data = await api<SuggestionResponse>('POST', '/api/caption-suggestions', {
        title: currentVideo.title,
        duration: currentVideo.duration,
        source: currentVideo.source,
        quality: currentVideo.quality,
        sharpness,
        clarity,
        noiseReduction,
        cropMode,
        exportFormat,
        fps,
        resolution,
      });
      setSuggestions(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const startRender = () => {
    setRenderQueued(true);
    setDownloadUrl(null);
    setRenderStatus(`Queued: ${currentVideo.title} is ready to upload for enhancement at ${resolution}, ${fps}, using ${cropMode} crop.`);
    setStep(4);
  };

  const renderVideo = async () => {
    if (!selectedVideo?.uri) {
      setError('Choose a real video from iPhone Photos before starting the render.');
      setStep(0);
      return;
    }
    setRendering(true);
    setError('');
    setRenderStatus('Uploading your video to the secure render queue…');
    try {
      const config = await api<RenderSignature>('POST', '/api/render/signature', { title: currentVideo.title });
      const fileName = `${currentVideo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'video'}.mp4`;
      const uploadUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`;
      const response = await FileSystem.uploadAsync(uploadUrl, selectedVideo.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'video/mp4',
        parameters: {
          api_key: config.apiKey,
          timestamp: String(config.timestamp),
          signature: config.signature,
          public_id: config.publicId,
          filename_override: fileName,
        },
      });
      const result = JSON.parse(response.body || '{}');
      if (response.status < 200 || response.status >= 300 || !result.secure_url) throw new Error(result.error?.message || 'The render service could not process this video.');
      setDownloadUrl(result.secure_url);
      setRenderStatus('Enhanced video is ready to review and download.');
      if (!suggestions) await buildCaptions();
    } catch (e) {
      setRenderStatus('Render did not complete.');
      setError((e as Error).message);
    } finally {
      setRendering(false);
    }
  };

  const downloadEnhancedVideo = async () => {
    if (!downloadUrl) {
      await renderVideo();
      return;
    }
    await Linking.openURL(downloadUrl);
  };

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.eyebrow}>QUALITY BOOSTER</Text>
            <Text style={styles.title}>Make rough clips hit harder.</Text>
          </View>
          <Link href="/" asChild>
            <Pressable style={styles.homeButton} accessibilityRole="link" accessibilityLabel="Go home">
              <Ionicons name="home" size={19} color="#ffffff" />
              <Text style={styles.homeButtonText}>Home</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={styles.subtitle}>Pick a real video from Photos, make it cleaner, then get a strong caption and hashtags from its edit details.</Text>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>{steps[step]}</Text>
          <Text style={styles.progressPercent}>{completion}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completion}%` }]} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepRow}>
          {steps.map((label, index) => (
            <Pressable
              key={label}
              onPress={() => setStep(index)}
              accessibilityRole="button"
              style={[styles.stepPill, index === step && styles.stepPillActive]}
            >
              <Text style={[styles.stepPillText, index === step && styles.stepPillTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {step === 0 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Choose a video from your device to start enhancing.</Text>
            <Text style={styles.panelNote}>Select a video from iPhone Photos, or start with a saved draft.</Text>
            <Pressable style={styles.primaryButton} onPress={pickVideo} accessibilityRole="button">
              <Ionicons name="film" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Choose from Photos</Text>
            </Pressable>
            {selectedVideo?.uri && (
              <View style={styles.selectedClip}>
                <Ionicons name="checkmark-circle" size={22} color="#ef4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedClipTitle}>Video selected</Text>
                  <Text style={styles.selectedClipText}>{selectedVideo.title} · {selectedVideo.duration} · {selectedVideo.format}</Text>
                </View>
              </View>
            )}
            <View style={styles.cardStack}> 
              {sampleVideos.map((video) => {
                const active = selectedVideo?.title === video.title;
                return (
                  <Pressable
                    key={video.title}
                    onPress={() => {
                      setSelectedVideo(video);
                      setVideoName(video.title);
                      setManualSource(video.source);
                    }}
                    accessibilityRole="button"
                    style={[styles.videoCard, active && styles.videoCardActive]}
                  >
                    <View style={styles.videoInfo}>
                      <Ionicons name="videocam" size={20} color="#ef4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.videoTitle}>{video.title}</Text>
                        <Text style={styles.videoMeta}>{video.duration} · {video.format} · {video.quality}</Text>
                      </View>
                    </View>
                    <Text style={styles.videoSource}>{video.source}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={videoName}
              onChangeText={setVideoName}
              placeholder="Clip name"
              placeholderTextColor="#737373"
              style={styles.input}
            />
            <TextInput
              value={manualSource}
              onChangeText={setManualSource}
              placeholder="Where it came from on your device"
              placeholderTextColor="#737373"
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={updateVideoFromManual} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Use this video</Text>
            </Pressable>
          </View>
        )}

        {step === 1 && (
          <View style={styles.panel}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Enhance clarity and sharpness to make the video look better.</Text>
                <Text style={styles.panelNote}>Automatic enhance starts on by default.</Text>
              </View>
              <Switch value={autoEnhance} onValueChange={setAutoEnhance} thumbColor="#ffffff" trackColor={{ false: '#3f3f46', true: '#ef4444' }} />
            </View>
            <Metric label="Sharpness" value={sharpness} onDown={() => setSharpness((v) => Math.max(0, v - 6))} onUp={() => setSharpness((v) => Math.min(100, v + 6))} />
            <Metric label="Clarity" value={clarity} onDown={() => setClarity((v) => Math.max(0, v - 6))} onUp={() => setClarity((v) => Math.min(100, v + 6))} />
            <Metric label="Noise Reduction" value={noiseReduction} onDown={() => setNoiseReduction((v) => Math.max(0, v - 6))} onUp={() => setNoiseReduction((v) => Math.min(100, v + 6))} />
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Enhance profile</Text>
              <Text style={styles.summaryText}>{autoEnhance ? 'Auto mode will prioritize clean detail and punchier edges.' : 'Manual mode keeps your custom tuning.'}</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Set the crop and export style for your enhanced video.</Text>
            <Text style={styles.panelNote}>Default crop stays Original, so your video keeps its framing.</Text>
            <OptionRow label="Crop" value={cropMode} options={['Original', '9:16', '1:1', '16:9']} onChange={(value) => setCropMode(value as typeof cropMode)} />
            <OptionRow label="Export" value={exportFormat} options={['TikTok MP4', 'High Bitrate MOV']} onChange={(value) => setExportFormat(value as typeof exportFormat)} />
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Format guide</Text>
              <Text style={styles.summaryText}>Keep faces centered, leave headroom for captions, and avoid pushing the crop tighter than the main subject.</Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={startRender} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Add to render queue</Text>
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Get a caption and hashtag pack from your enhanced video.</Text>
            <Text style={styles.panelNote}>Suggestions are generated automatically from your clip and enhancement settings.</Text>
            <Pressable style={styles.primaryButton} onPress={buildCaptions} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Analyse video and suggest hashtags</Text>
            </Pressable>
            {loadingSuggestions && <ActivityIndicator style={{ marginTop: 18 }} color="#ef4444" />}
            {suggestions && (
              <View style={styles.cardStack}>
                <View style={[styles.outputCard, styles.hookCard]}>
                  <View style={styles.outputHeading}><Ionicons name="flash" size={16} color="#ef4444" /><Text style={styles.outputLabel}>Open with this</Text></View>
                  <Text style={styles.hookText}>{suggestions.hook}</Text>
                </View>
                <View style={styles.outputCard}>
                  <View style={styles.outputHeading}><Ionicons name="chatbubble-ellipses" size={16} color="#ef4444" /><Text style={styles.outputLabel}>Caption</Text></View>
                  <Text style={styles.outputText}>{suggestions.caption}</Text>
                </View>
                <View style={[styles.outputCard, styles.tagCard]}>
                  <View style={styles.outputHeading}><Ionicons name="pricetags" size={16} color="#ef4444" /><Text style={styles.outputLabel}>Best tags</Text></View>
                  <View style={styles.tagWrap}>{suggestions.hashtags.map((tag) => <View key={tag} style={styles.tagPill}><Text style={styles.tagText}>{tag}</Text></View>)}</View>
                </View>
              </View>
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Render queue</Text>
            <OptionRow label="Resolution" value={resolution} options={['1080p', '4K']} onChange={(value) => setResolution(value as typeof resolution)} />
            <OptionRow label="Frame rate" value={fps} options={['30 FPS', '60 FPS']} onChange={(value) => setFps(value as typeof fps)} />
            <View style={styles.summaryBox}>
              <View style={styles.outputHeading}><Ionicons name={renderQueued ? 'time' : 'ellipse-outline'} size={16} color="#ef4444" /><Text style={styles.summaryTitle}>Render status</Text></View>
              <Text style={styles.summaryText}>{renderStatus}</Text>
              {!!suggestions?.exportNote && <Text style={[styles.summaryText, { marginTop: 10 }]}>{suggestions.exportNote}</Text>}
            </View>
            <View style={styles.exportCard}>
              <Text style={styles.exportTitle}>{currentVideo.title}</Text>
              <Text style={styles.exportMeta}>{resolution} · {fps} · {cropMode} · {exportFormat}</Text>
              <Text style={styles.exportMeta}>Source: {currentVideo.source}</Text>
            </View>
            <Pressable style={[styles.downloadButton, (!renderQueued || rendering) && styles.downloadButtonDisabled]} onPress={downloadEnhancedVideo} accessibilityRole="button" disabled={!renderQueued || rendering}>
              {rendering ? <ActivityIndicator color="#ffffff" /> : <Ionicons name={downloadUrl ? 'download-outline' : 'cloud-upload-outline'} size={20} color="#ffffff" />}
              <Text style={styles.primaryButtonText}>{rendering ? 'Rendering enhanced video…' : downloadUrl ? 'Download enhanced video' : 'Start render'}</Text>
            </Pressable>
            <Text style={styles.downloadNote}>{downloadUrl ? 'Your enhanced video is ready. Tap Download enhanced video to save it.' : 'Start render uploads the selected video securely, then prepares it for download.'}</Text>
            {downloadUrl && (
              <View style={styles.resultPanel}>
                <View style={styles.resultHeader}><Ionicons name="checkmark-circle" size={22} color="#ef4444" /><Text style={styles.resultTitle}>Render result</Text></View>
                <Text style={styles.resultText}>Your source video was uploaded and prepared as {resolution} at {fps} using {cropMode} crop.</Text>
                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonCard}><Text style={styles.comparisonLabel}>SOURCE</Text><Text style={styles.comparisonValue}>{currentVideo.quality}</Text><Text style={styles.comparisonMeta}>{currentVideo.format}</Text></View>
                  <Ionicons name="arrow-forward" size={20} color="#ef4444" />
                  <View style={[styles.comparisonCard, styles.comparisonCardActive]}><Text style={styles.comparisonLabel}>ENHANCED</Text><Text style={styles.comparisonValue}>{resolution}</Text><Text style={styles.comparisonMeta}>{fps}</Text></View>
                </View>
                <Text style={styles.resultSubtitle}>Recommended hashtags</Text>
                {suggestions ? <View style={styles.tagWrap}>{suggestions.hashtags.map((tag) => <View key={tag} style={styles.tagPill}><Text style={styles.tagText}>{tag}</Text></View>)}</View> : <Pressable style={styles.hashtagButton} onPress={buildCaptions} accessibilityRole="button"><Text style={styles.primaryButtonText}>Generate recommended hashtags</Text></Pressable>}
              </View>
            )}
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={back} accessibilityRole="button" style={[styles.secondaryButton, step === 0 && styles.secondaryButtonDisabled]} disabled={step === 0}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
        <Pressable onPress={next} accessibilityRole="button" style={styles.primaryButtonCompact}>
          <Text style={styles.primaryButtonText}>{step === steps.length - 1 ? 'Review' : 'Next'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Metric({ label, value, onDown, onUp }: { label: string; value: number; onDown: () => void; onUp: () => void }) {
  return (
    <View style={styles.metricRow}>
      <View>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}%</Text>
      </View>
      <View style={styles.metricControls}>
        <Pressable style={styles.metricButton} onPress={onDown} accessibilityRole="button">
          <Ionicons name="remove" size={18} color="#ffffff" />
        </Pressable>
        <Pressable style={styles.metricButton} onPress={onUp} accessibilityRole="button">
          <Ionicons name="add" size={18} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

function OptionRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <View style={styles.optionBlock}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const active = option === value;
          return (
            <Pressable key={option} onPress={() => onChange(option)} accessibilityRole="button" style={[styles.optionChip, active && styles.optionChipActive]}>
              <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111111' },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  homeButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#242424', flexDirection: 'row', alignItems: 'center', gap: 6 },
  homeButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  eyebrow: { color: '#ef4444', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: '#ffffff', fontSize: 30, fontWeight: '900', lineHeight: 34, marginTop: 10 },
  subtitle: { color: '#d4d4d8', fontSize: 15, lineHeight: 22, marginTop: 10 },
  progressCard: { marginHorizontal: 20, backgroundColor: '#191919', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#27272a' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  progressPercent: { color: '#ef4444', fontSize: 16, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#2a2a2a', marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#ef4444' },
  stepRow: { gap: 10, paddingTop: 14 },
  stepPill: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#222222' },
  stepPillActive: { backgroundColor: '#ef4444' },
  stepPillText: { color: '#a1a1aa', fontSize: 13, fontWeight: '700' },
  stepPillTextActive: { color: '#ffffff' },
  content: { padding: 20, paddingBottom: 120, gap: 16 },
  panel: { backgroundColor: '#191919', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#27272a', gap: 14 },
  panelTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', lineHeight: 28 },
  panelNote: { color: '#a1a1aa', fontSize: 14, lineHeight: 20 },
  cardStack: { gap: 12 },
  videoCard: { padding: 14, borderRadius: 18, backgroundColor: '#111111', borderWidth: 1, borderColor: '#2f2f2f', gap: 10 },
  videoCardActive: { borderColor: '#ef4444' },
  videoInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  videoTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  videoMeta: { color: '#a1a1aa', fontSize: 13, marginTop: 2 },
  videoSource: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  input: { backgroundColor: '#111111', color: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#2f2f2f', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  primaryButton: { backgroundColor: '#ef4444', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, minHeight: 52, flexDirection: 'row', gap: 9 },
  pickedNote: { color: '#fca5a5', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  selectedClip: { flexDirection: 'row', gap: 10, borderRadius: 16, backgroundColor: '#111111', borderWidth: 1, borderColor: '#ef4444', padding: 13, alignItems: 'center' },
  selectedClipTitle: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  selectedClipText: { color: '#d4d4d8', fontSize: 13, marginTop: 3 },
  primaryButtonCompact: { backgroundColor: '#ef4444', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, minHeight: 52, flex: 1 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  secondaryButton: { backgroundColor: '#222222', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, minHeight: 52, flex: 1 },
  secondaryButtonDisabled: { opacity: 0.45 },
  secondaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111111', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#2f2f2f' },
  metricLabel: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  metricValue: { color: '#ef4444', fontSize: 24, fontWeight: '900', marginTop: 4 },
  metricControls: { flexDirection: 'row', gap: 10 },
  metricButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  optionBlock: { gap: 10 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: '#111111', borderWidth: 1, borderColor: '#2f2f2f' },
  optionChipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  optionChipText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  optionChipTextActive: { color: '#ffffff' },
  summaryBox: { backgroundColor: '#111111', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f2f2f' },
  summaryTitle: { color: '#ffffff', fontSize: 15, fontWeight: '800', marginBottom: 0 },
  summaryText: { color: '#d4d4d8', fontSize: 14, lineHeight: 21 },
  outputCard: { backgroundColor: '#111111', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2f2f2f' },
  hookCard: { borderColor: '#ef4444' },
  tagCard: { backgroundColor: '#151515' },
  outputHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  outputLabel: { color: '#ef4444', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: .5 },
  outputText: { color: '#ffffff', fontSize: 15, lineHeight: 23 },
  hookText: { color: '#ffffff', fontSize: 20, lineHeight: 27, fontWeight: '900' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill: { backgroundColor: '#ef4444', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  tagText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  exportCard: { backgroundColor: '#ef4444', borderRadius: 20, padding: 18, gap: 6 },
  downloadButton: { backgroundColor: '#ef4444', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, minHeight: 52, flexDirection: 'row', gap: 9 },
  downloadButtonDisabled: { opacity: 0.62 },
  downloadNote: { color: '#a1a1aa', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  resultPanel: { backgroundColor: '#111111', borderRadius: 18, borderWidth: 1, borderColor: '#ef4444', padding: 16, gap: 13 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  resultText: { color: '#d4d4d8', fontSize: 14, lineHeight: 20 },
  comparisonRow: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between' },
  comparisonCard: { flex: 1, backgroundColor: '#1e1e1e', borderRadius: 14, padding: 12, gap: 3 },
  comparisonCardActive: { borderWidth: 1, borderColor: '#ef4444' },
  comparisonLabel: { color: '#a1a1aa', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  comparisonValue: { color: '#ffffff', fontSize: 19, fontWeight: '900' },
  comparisonMeta: { color: '#d4d4d8', fontSize: 12, fontWeight: '700' },
  resultSubtitle: { color: '#ffffff', fontSize: 15, fontWeight: '900', marginTop: 2 },
  hashtagButton: { backgroundColor: '#ef4444', borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 12 },
  exportTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  exportMeta: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  error: { color: '#fca5a5', fontSize: 14, lineHeight: 20 },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 20, flexDirection: 'row', gap: 12 },
});
