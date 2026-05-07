export const driveLinks = {
  root: "https://drive.google.com/drive/folders/1STT9K8fDtIyihAz5QVDD-l8YxdguCn7a",
  materialsRoot: "https://drive.google.com/drive/folders/1xenDzW-ocq3GkOsiYRRZjDf8EiLlF_c7",
  logsRoot: "https://drive.google.com/drive/folders/1KMVhRUeSs92tksa6dzhXxwWrg4V-tx4G",
  subjects: {
    english: {
      homework: "https://drive.google.com/drive/folders/1V1_cyYS195Et6XcPqDNcDYaJ0AM3lP1a",
      test: "https://drive.google.com/drive/folders/1l221kb0dc98XBNJmT3nk_pecdA4wmJMm",
      challenge: "https://drive.google.com/drive/folders/1CA32L5u4gS9n1E2bgb0Z3uJWaxQum4FO",
      free: "https://drive.google.com/drive/folders/19QmNOchvVoHilrLlDAwpKUFO0EPfMgCc",
    },
    math: {},
    science: {},
    social: {},
    japanese: {
      homework: "https://drive.google.com/drive/folders/19IjquDkAEuzsH0zXnZ9IvlZNEMM8OuwU",
      test: "https://drive.google.com/drive/folders/17zkedBo7MXRZkUqHFry0alA7Pnh6sm0V",
      challenge: "https://drive.google.com/drive/folders/1v5Jf4PDPHP5KcL3i5HBMd-wCwMgSPTCd",
      free: "https://drive.google.com/drive/folders/1E4otqLb9SkqYWxYBnnsV7md3gAqf0EZi",
    },
  },
};

export const driveSubjectKeys = {
  英語: "english",
  数学: "math",
  理科: "science",
  社会: "social",
  国語: "japanese",
};

export const drivePurposeKeys = {
  宿題: "homework",
  テスト勉強: "test",
  チャレンジ: "challenge",
  自由学習: "free",
};

export function cleanDriveUrl(url) {
  return typeof url === "string" && url.trim().startsWith("https://") ? url.trim() : "";
}

export function resolveDriveFolderLink(draft = {}) {
  const overrideUrl = cleanDriveUrl(draft.driveUrl);
  const subject = draft.subject || "英語";
  const purpose = draft.purpose || "宿題";

  if (overrideUrl) {
    return {
      url: overrideUrl,
      label: "貼ったDriveリンクを開く",
      configured: true,
      source: "override",
    };
  }

  const subjectKey = driveSubjectKeys[subject];
  const purposeKey = drivePurposeKeys[purpose];
  const configuredUrl = cleanDriveUrl(driveLinks.subjects?.[subjectKey]?.[purposeKey]);

  if (configuredUrl) {
    return {
      url: configuredUrl,
      label: `${subject} / ${purpose} フォルダを開く`,
      configured: true,
      source: "configured",
    };
  }

  return {
    url: cleanDriveUrl(draft.driveRootUrl) || driveLinks.root,
    label: "Driveルートを開く",
    configured: false,
    source: "root",
  };
}
