import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { StylishTextInput } from "@/components/forms/stylish-text-input";
import { StylishText } from "@/components/typography/stylish-text";
import { borderRadius, colors, spacing } from "@/constants/design-tokens";
import { DashboardDialog } from "@/features/merchant-dashboard/dashboard-dialog";
import {
  DashboardButton,
  DashboardIcon,
} from "@/features/merchant-dashboard/dashboard-primitives";
import {
  searchSupport,
  type SupportChannel,
  type SupportSection,
  supportChannels,
  supportSections,
} from "@/features/merchant-dashboard/support-content-data";

/**
 * Help & Support, in the dashboard's existing dialog shell.
 *
 * It is a reference, not a ticket form: this project has no support API, so
 * offering a "send us a message" box would be pretending. The contact card
 * shows real channels and says what each is for instead.
 */
export function HelpSupportDialog({
  contactFirst = false,
  initialSectionId,
  onClose,
  visible,
}: {
  /** Puts the contact channels above the guides, for a "Contact Support" entry. */
  contactFirst?: boolean;
  /** Opens with this section's first question already expanded. */
  initialSectionId?: string;
  onClose: () => void;
  visible: boolean;
}) {
  const [query, setQuery] = useState("");
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);

  // Reopening from a different Help entry lands on that entry's subject rather
  // than wherever the last visit was left.
  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setOpenTopicId(
      supportSections.find((section) => section.id === initialSectionId)
        ?.topics[0]?.id ?? null,
    );
  }, [initialSectionId, visible]);

  const sections = useMemo(
    () => searchSupport(supportSections, query),
    [query],
  );

  return (
    <DashboardDialog
      description="Guides for running your merchant workspace, and how to reach the Velori partner team."
      footer={
        <DashboardButton
          label="Close"
          onPress={onClose}
          testID="help-support-close-button"
        />
      }
      onClose={onClose}
      testID="help-support"
      title="Help & Support"
      visible={visible}
      width={680}
    >
      {contactFirst ? <ContactBlock /> : null}

      <StylishTextInput
        accessibilityLabel="Search help topics"
        onChangeText={setQuery}
        placeholder="Search help topics"
        placeholderTextColor={colors.neutral[450]}
        style={styles.input}
        testID="help-support-search"
        value={query}
      />

      {sections.length === 0 ? (
        <View style={styles.empty} testID="help-support-empty">
          <DashboardIcon color={colors.neutral[450]} name="magnify" size={20} />
          <StylishText style={styles.emptyText} unstyled variant="caption">
            {`Nothing matches “${query.trim()}”. Try a different word, or contact the partner team below.`}
          </StylishText>
        </View>
      ) : (
        sections.map((section) => (
          <SupportSectionBlock
            key={section.id}
            onToggle={(topicId) =>
              setOpenTopicId((current) =>
                current === topicId ? null : topicId,
              )
            }
            openTopicId={openTopicId}
            section={section}
          />
        ))
      )}

      {contactFirst ? null : <ContactBlock />}
    </DashboardDialog>
  );
}

/** The contact channels, rendered once and placed by `contactFirst`. */
function ContactBlock() {
  return (
    <View style={styles.channels} testID="help-support-contact">
      <StylishText style={styles.groupLabel} unstyled variant="caption">
        Contact support
      </StylishText>
      {supportChannels.map((channel) => (
        <ChannelRow channel={channel} key={channel.id} />
      ))}
      <View style={styles.notice}>
        <DashboardIcon
          color={colors.feedback.info}
          name="information-outline"
          size={14}
        />
        <StylishText style={styles.noticeText} unstyled variant="caption">
          These details are demo content. There is no support API yet, so
          nothing on this screen files a request on your behalf.
        </StylishText>
      </View>
    </View>
  );
}

function SupportSectionBlock({
  onToggle,
  openTopicId,
  section,
}: {
  onToggle: (topicId: string) => void;
  openTopicId: string | null;
  section: SupportSection;
}) {
  return (
    <View style={styles.section} testID={`help-section-${section.id}`}>
      <View style={styles.sectionHeading}>
        <DashboardIcon
          color={colors.brand.primary}
          name={section.icon}
          size={16}
        />
        <StylishText style={styles.sectionTitle} unstyled variant="label">
          {section.title}
        </StylishText>
      </View>

      {section.topics.map((topic) => {
        const open = openTopicId === topic.id;

        return (
          <View key={topic.id}>
            <Pressable
              accessibilityLabel={topic.question}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              className="focus-visible:ring-[3px] focus-visible:ring-brand-blue/55"
              onPress={() => onToggle(topic.id)}
              style={styles.topicRow}
              testID={`help-topic-${topic.id}`}
            >
              <StylishText style={styles.topicQuestion} unstyled variant="body">
                {topic.question}
              </StylishText>
              <DashboardIcon
                color={colors.neutral[550]}
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
              />
            </Pressable>
            {open ? (
              <StylishText
                style={styles.topicAnswer}
                testID={`help-answer-${topic.id}`}
                unstyled
                variant="caption"
              >
                {topic.answer}
              </StylishText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function ChannelRow({ channel }: { channel: SupportChannel }) {
  return (
    <View style={styles.channel} testID={`help-channel-${channel.id}`}>
      <DashboardIcon
        color={colors.neutral[550]}
        name={channel.icon}
        size={16}
      />
      <View style={styles.channelCopy}>
        <StylishText style={styles.channelTitle} unstyled variant="body">
          {channel.title}
        </StylishText>
        <StylishText style={styles.channelDetail} unstyled variant="caption">
          {`${channel.detail} · ${channel.responseTime}`}
        </StylishText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  channel: {
    alignItems: "center",
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    padding: spacing.sm,
  },
  channelCopy: { flexBasis: 0, flexGrow: 1, gap: 1, minWidth: 0 },
  channelDetail: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  channelTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 13,
    lineHeight: 20,
  },
  channels: { gap: spacing.xs },
  empty: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  emptyText: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  groupLabel: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 11,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.neutral[150],
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    color: colors.ink.primary,
    fontFamily: "Montserrat_400Regular",
    fontSize: 13,
    lineHeight: 20,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  notice: {
    alignItems: "flex-start",
    backgroundColor: colors.feedback.infoSoft,
    borderColor: colors.brand.blueSoft,
    borderRadius: borderRadius.input,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  noticeText: {
    color: colors.feedback.info,
    flexShrink: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  section: { gap: spacing.xxs },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  sectionTitle: {
    color: colors.ink.primary,
    fontFamily: "Montserrat_700Bold",
    fontSize: 13,
    lineHeight: 20,
  },
  topicAnswer: {
    color: colors.neutral[550],
    fontFamily: "Montserrat_400Regular",
    fontSize: 12,
    lineHeight: 19,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  topicQuestion: {
    color: colors.ink.primary,
    flexBasis: 0,
    flexGrow: 1,
    fontFamily: "Montserrat_500Medium",
    fontSize: 13,
    lineHeight: 20,
    minWidth: 0,
  },
  topicRow: {
    alignItems: "center",
    borderRadius: borderRadius.input,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
});
