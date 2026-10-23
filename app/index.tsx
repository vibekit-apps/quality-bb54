import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
type Trend = { title: string; angle: string; tags: string[] };
type TrendsResponse = { niche: string; items: Trend[]; updatedAt: string; source: string };

const niches = ['Practical basketball', 'Roblox edits'];

export default function Home() {
  const [niche, setNiche] = useState('Practical basketball');
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [customNiche, setCustomNiche] = useState('');
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTrends = useCallback(async (nextNiche = niche) => {
    setTrendsLoading(true);
    setError('');
    try {
      setTrends(await api<TrendsResponse>('GET', `/api/trends?niche=${encodeURIComponent(nextNiche)}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTrendsLoading(false);
    }
  }, [niche]);

  useEffect(() => { loadTrends(); }, [loadTrends]);

  const chooseNiche = (nextNiche: string) => {
    setNiche(nextNiche);
    loadTrends(nextNiche);
  };

  const useCustomNiche = () => {
    const next = customNiche.trim();
    if (!next) return;
    setNiche(next);
    loadTrends(next);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.eyebrow}>D4V1D.FLOW</Text>
            <Text style={styles.title}>Better videos. Bigger reach.</Text>
          </View>
          <View style={styles.mark}><Ionicons name="flash" size={23} color="#ffffff" /></View>
        </View>

        <View style={styles.hero}>
          <Image source={require('../assets/d4v1d-flow-brand.jpg')} style={styles.brandImage} resizeMode="cover" accessibilityLabel="D4v1d.Flow brand mark" />
          <Text style={styles.heroKicker}>ENHANCE · ANALYSE · CREATE</Text>
          <Text style={styles.heroTitle}>Make your next edit look expensive.</Text>
          <Text style={styles.heroText}>Boost detail, analyse your edit settings, then get captions and focused hashtag ideas.</Text>
          <Link href="/studio" asChild>
            <Pressable style={styles.primaryButton} accessibilityRole="link">
              <Ionicons name="sparkles" size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Start an enhancement</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.analysisCard}>
          <View style={styles.accountIcon}><Ionicons name="color-wand" size={21} color="#ef4444" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountTitle}>Automatic caption analysis</Text>
            <Text style={styles.accountText}>After enhancement, get a hook, caption, and five focused hashtags from your clip details.</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Trending in your niche</Text>
          <Pressable onPress={() => loadTrends()} accessibilityRole="button"><Text style={styles.refresh}>Refresh</Text></Pressable>
        </View>
        <Text style={styles.sectionSub}>Idea angles and tags curated for {niche}.</Text>
        <View style={styles.chips}>
          {niches.map((item) => (
            <Pressable key={item} onPress={() => chooseNiche(item)} accessibilityRole="button" style={[styles.chip, niche === item && styles.chipActive]}>
              <Text style={[styles.chipText, niche === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.customRow}>
          <TextInput value={customNiche} onChangeText={setCustomNiche} placeholder="Your niche" placeholderTextColor="#737373" style={styles.input} onSubmitEditing={useCustomNiche} />
          <Pressable onPress={useCustomNiche} accessibilityRole="button" style={styles.addNiche}><Ionicons name="add" size={22} color="#ffffff" /></Pressable>
        </View>

        {trendsLoading ? <ActivityIndicator color="#ef4444" style={{ marginTop: 20 }} /> : trends?.items.map((trend, index) => (
          <View key={`${trend.title}-${index}`} style={styles.trendCard}>
            <View style={styles.trendNumber}><Text style={styles.trendNumberText}>0{index + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trendTitle}>{trend.title}</Text>
              <Text style={styles.trendAngle}>{trend.angle}</Text>
              <Text style={styles.tags}>{trend.tags.join(' ')}</Text>
            </View>
          </View>
        ))}
        {!!trends && <Text style={styles.source}>Source: {trends.source}. Use these as creative directions, not a claim of live TikTok ranking.</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.nav}>
        <View style={styles.navItem}><Ionicons name="home" size={21} color="#ef4444" /><Text style={styles.navActive}>Home</Text></View>
        <Link href="/studio" asChild><Pressable style={styles.navItem} accessibilityRole="link"><Ionicons name="sparkles-outline" size={21} color="#a1a1aa" /><Text style={styles.navText}>Enhance</Text></Pressable></Link>
        <Pressable onPress={() => loadTrends()} style={styles.navItem} accessibilityRole="button"><Ionicons name="trending-up-outline" size={21} color="#a1a1aa" /><Text style={styles.navText}>Trends</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111111' }, content: { padding: 20, paddingBottom: 104, gap: 14 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 5 }, eyebrow: { color: '#ef4444', fontWeight: '900', fontSize: 12, letterSpacing: 1.3 }, title: { color: '#ffffff', fontSize: 27, lineHeight: 32, fontWeight: '900', maxWidth: 290, marginTop: 7 }, mark: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 8, padding: 14, borderRadius: 25, backgroundColor: '#191919', borderWidth: 1, borderColor: '#473569', gap: 10, overflow: 'hidden' }, brandImage: { width: '100%', height: 140, borderRadius: 17, opacity: 0.92 }, heroKicker: { color: '#c4b5fd', fontSize: 12, fontWeight: '900', letterSpacing: 1.1, marginTop: 3 }, heroTitle: { color: '#ffffff', fontSize: 27, lineHeight: 31, fontWeight: '900' }, heroText: { color: '#ffffff', fontSize: 15, lineHeight: 21 }, primaryButton: { minHeight: 52, borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 8 }, primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }, sectionTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' }, connected: { color: '#ef4444', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }, refresh: { color: '#ef4444', fontSize: 14, fontWeight: '800' }, sectionSub: { color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginTop: -7 },
  analysisCard: { borderRadius: 21, backgroundColor: '#191919', borderWidth: 1, borderColor: '#2d2d2d', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }, accountIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' }, accountTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900' }, accountText: { color: '#a1a1aa', fontSize: 13, lineHeight: 18, marginTop: 3 },
  chips: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' }, chip: { backgroundColor: '#1d1d1d', borderWidth: 1, borderColor: '#303030', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }, chipActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' }, chipText: { color: '#d4d4d8', fontSize: 13, fontWeight: '700' }, chipTextActive: { color: '#ffffff' }, customRow: { flexDirection: 'row', gap: 10 }, input: { flex: 1, backgroundColor: '#191919', color: '#ffffff', borderRadius: 15, borderWidth: 1, borderColor: '#303030', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }, addNiche: { width: 48, borderRadius: 15, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  trendCard: { backgroundColor: '#191919', borderWidth: 1, borderColor: '#2d2d2d', borderRadius: 21, padding: 15, flexDirection: 'row', gap: 13 }, trendNumber: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }, trendNumberText: { color: '#ffffff', fontWeight: '900', fontSize: 12 }, trendTitle: { color: '#ffffff', fontSize: 16, fontWeight: '900', lineHeight: 21 }, trendAngle: { color: '#d4d4d8', fontSize: 13, lineHeight: 19, marginTop: 5 }, tags: { color: '#ef4444', fontSize: 12, lineHeight: 18, marginTop: 8, fontWeight: '700' }, source: { color: '#737373', fontSize: 12, lineHeight: 17 }, error: { color: '#fca5a5', fontSize: 13, lineHeight: 19 },
  nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 82, backgroundColor: '#191919', borderTopWidth: 1, borderTopColor: '#303030', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12 }, navItem: { alignItems: 'center', minWidth: 70, gap: 4 }, navActive: { color: '#ef4444', fontSize: 12, fontWeight: '800' }, navText: { color: '#a1a1aa', fontSize: 12, fontWeight: '700' },
});
