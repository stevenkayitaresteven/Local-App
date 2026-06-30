import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  AKAZI_EMPLOYMENT,
  AKAZI_PAY_PERIOD,
  type AkaziDto,
  type AkaziEmployment,
  type AkaziKind,
  type AkaziPayPeriod,
} from "@umuturanyi/shared";
import { useAkaziCategories } from "@/lib/hooks";
import { useAuth } from "@/store/auth";
import { api, ApiError } from "@/lib/api";
import { Button, Chip } from "@/components/ui";
import { palette, radius, spacing } from "@/theme";

const EMPLOYMENT_LABEL: Record<AkaziEmployment, string> = {
  full_time: "Igihe cyose",
  part_time: "Igice cy'igihe",
  temporary: "By'agateganyo",
  contract: "Amasezerano",
  gig: "Akazi gato",
  flexible: "Bihinduka",
};

const PAY_PERIOD_LABEL: Record<AkaziPayPeriod, string> = {
  hour: "Ku isaha",
  day: "Ku munsi",
  week: "Ku cyumweru",
  month: "Ku kwezi",
  fixed: "Igiteranyo",
  negotiable: "Kungurana ibitekerezo",
};

export default function NewAkazi() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const { data: cats } = useAkaziCategories();

  const [kind, setKind] = useState<AkaziKind>("service");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategory] = useState<string | undefined>(undefined);
  const [employment, setEmployment] = useState<AkaziEmployment>("flexible");
  const [isRemote, setIsRemote] = useState(false);
  const [payPeriod, setPayPeriod] = useState<AkaziPayPeriod>("negotiable");
  const [payMin, setPayMin] = useState("");
  const [payMax, setPayMax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const negotiable = payPeriod === "negotiable";
  const num = (s: string) => Number(s.replace(/\D/g, "")) || 0;

  async function submit() {
    setError(null);
    const slug = categorySlug ?? cats?.categories[0]?.slug;
    if (!slug) {
      setError("Hitamo icyiciro");
      return;
    }
    setLoading(true);
    try {
      const { akazi } = await api.post<{ akazi: AkaziDto }>("/akazi", {
        kind,
        title: title.trim(),
        description: description.trim(),
        categorySlug: slug,
        employment,
        isRemote,
        payPeriod,
        ...(negotiable ? {} : { payMin: num(payMin), payMax: num(payMax) || num(payMin) }),
        neighborhoodSlug: user?.neighborhood?.slug ?? "kimironko",
      });
      void qc.invalidateQueries({ queryKey: ["akazi"] });
      router.replace(`/akazi/${akazi.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Habaye ikibazo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={palette.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Tangaza akazi</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.lg }}>
        <View style={styles.segment}>
          <SegBtn label="Ndatanga serivisi" active={kind === "service"} onPress={() => setKind("service")} />
          <SegBtn label="Nshaka umukozi" active={kind === "job"} onPress={() => setKind("job")} />
        </View>

        <Field
          label="Umutwe"
          value={title}
          onChangeText={setTitle}
          placeholder={kind === "service" ? "Nkora isuku y'amazu" : "Dushaka umufasha w'iduka"}
        />
        <Field
          label="Ibisobanuro"
          value={description}
          onChangeText={setDescription}
          placeholder="Sobanura akazi cyangwa serivisi, ubunararibonye, n'aho biba…"
          multiline
        />

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.fieldLabel}>Icyiciro</Text>
          <View style={styles.chips}>
            {(cats?.categories ?? []).map((c) => (
              <Chip
                key={c.slug}
                label={`${c.icon} ${c.rw}`}
                active={(categorySlug ?? cats?.categories[0]?.slug) === c.slug}
                onPress={() => setCategory(c.slug)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.fieldLabel}>Uburyo bw'akazi</Text>
          <View style={styles.chips}>
            {AKAZI_EMPLOYMENT.map((e) => (
              <Chip key={e} label={EMPLOYMENT_LABEL[e]} active={employment === e} onPress={() => setEmployment(e)} />
            ))}
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>Bishobora gukorerwa kure (remote)</Text>
          <Switch value={isRemote} onValueChange={setIsRemote} trackColor={{ true: palette.sky }} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.fieldLabel}>Uko bishyurwa</Text>
          <View style={styles.chips}>
            {AKAZI_PAY_PERIOD.map((p) => (
              <Chip key={p} label={PAY_PERIOD_LABEL[p]} active={payPeriod === p} onPress={() => setPayPeriod(p)} />
            ))}
          </View>
        </View>

        {!negotiable ? (
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Field label="Hasi (Frw)" value={payMin} onChangeText={setPayMin} placeholder="8000" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Hejuru (Frw)" value={payMax} onChangeText={setPayMax} placeholder="12000" keyboardType="numeric" />
            </View>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Tangaza" onPress={submit} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.textFaint}
        style={[styles.input, multiline && { height: 110, paddingTop: 12, textAlignVertical: "top" }]}
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerTitle: { fontWeight: "800", fontSize: 17, color: palette.ink },
  segment: { flexDirection: "row", gap: spacing.sm, backgroundColor: palette.surfaceMuted, borderRadius: radius.md, padding: 4 },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm },
  segBtnActive: { backgroundColor: palette.white },
  segText: { fontWeight: "700", fontSize: 13.5, color: palette.textMuted },
  segTextActive: { color: palette.ink },
  fieldLabel: { fontWeight: "600", fontSize: 13, color: palette.textSecondary },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: palette.textPrimary,
    backgroundColor: palette.white,
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, rowGap: spacing.sm },
  error: { color: palette.danger, fontSize: 13, fontWeight: "600" },
});
