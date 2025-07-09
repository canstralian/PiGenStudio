import type { PiGenConfig } from "@shared/schema";

export const DEFAULT_PI_GEN_CONFIG: PiGenConfig = {
  imageName: "raspios-custom",
  release: "bullseye",
  deployCompression: "xz",
  locale: "en_US.UTF-8",
  timezone: "Europe/London",
  keyboardKeymap: "gb",
  keyboardLayout: "English (UK)",
  enableSsh: true,
  skipImages: "0,1",
  stages: {
    stage2: {
      enabled: true,
      skipImage: "0",
      packages: [],
      runScript: "#!/bin/bash\n\necho 'Running stage2 setup...'\n",
    },
    stage3: {
      enabled: false,
      skipImage: "1",
      packages: [],
      runScript: "#!/bin/bash\n\necho 'Running stage3 setup...'\n",
    },
    stage4: {
      enabled: false,
      skipImage: "1",
      packages: [],
      runScript: "#!/bin/bash\n\necho 'Running stage4 setup...'\n",
    },
  },
};

export const PI_GEN_RELEASES = [
  { value: "bullseye", label: "Bullseye" },
  { value: "bookworm", label: "Bookworm" },
  { value: "buster", label: "Buster" },
];

export const COMPRESSION_FORMATS = [
  { value: "xz", label: "XZ" },
  { value: "gz", label: "GZ" },
  { value: "zip", label: "ZIP" },
];

export const COMMON_LOCALES = [
  "en_US.UTF-8",
  "en_GB.UTF-8",
  "de_DE.UTF-8",
  "fr_FR.UTF-8",
  "es_ES.UTF-8",
  "it_IT.UTF-8",
  "ja_JP.UTF-8",
  "zh_CN.UTF-8",
];

export const COMMON_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export function generateConfigFile(config: PiGenConfig): string {
  return `# Pi-Gen Configuration
IMG_NAME="${config.imageName}"
RELEASE="${config.release}"
DEPLOY_COMPRESSION="${config.deployCompression}"
LOCALE_DEFAULT="${config.locale}"
TIMEZONE_DEFAULT="${config.timezone}"
KEYBOARD_KEYMAP="${config.keyboardKeymap}"
KEYBOARD_LAYOUT="${config.keyboardLayout}"

# Stage configuration
SKIP_IMAGES="${config.skipImages}"
ENABLE_SSH="${config.enableSsh ? '1' : '0'}"

# Custom stages
${Object.entries(config.stages).map(([stage, stageConfig]) => 
  `# ${stage}\n${stage.toUpperCase()}_SKIP_IMAGE="${stageConfig.skipImage}"`
).join('\n')}
`;
}

export function validatePiGenConfig(config: PiGenConfig): string[] {
  const errors: string[] = [];

  if (!config.imageName?.trim()) {
    errors.push("Image name is required");
  }

  if (!config.release?.trim()) {
    errors.push("Release is required");
  }

  if (!config.locale?.trim()) {
    errors.push("Locale is required");
  }

  if (!config.timezone?.trim()) {
    errors.push("Timezone is required");
  }

  return errors;
}
