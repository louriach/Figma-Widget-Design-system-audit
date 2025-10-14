const { widget } = figma
const { useSyncedState, useEffect, AutoLayout, Text, SVG, Rectangle } = widget

// Helper function to ensure safe text rendering - never returns empty strings
const safeText = (value: any): string => {
  // Handle null, undefined, false, 0, etc.
  if (value === null || value === undefined || value === false) return 'N/A'
  
  // Handle arrays and objects
  if (typeof value === 'object') {
    if (Array.isArray(value)) return `Array(${value.length})`
    return 'Object'
  }
  
  // Convert to string and clean
  const str = String(value).trim()
  
  // Return N/A for any empty or whitespace-only strings
  return str.length > 0 ? str : 'N/A'
}

interface UnboundProperty {
  type: 'fill' | 'stroke' | 'text' | 'cornerRadius' | 'spacing' | 'effect' | 'appearance'
  property: string
  currentValue?: string
  nodePath?: string
  nodeId?: string  // Store the actual node ID for direct navigation
}

interface ComponentAuditData {
  id: string
  name: string
  componentSetName?: string
  variantProperties?: Record<string, string>
  pageName: string
  hasDescription: boolean
  hasDocumentationLink: boolean
  hasUnboundProperties: boolean
  unboundProperties: UnboundProperty[]
  isHiddenFromPublishing: boolean
  isOnCurrentPage: boolean
  isComponentSet?: boolean  // True if this represents the component set itself
  isVariant?: boolean       // True if this is a variant within a component set
  hasExpandableContent?: boolean  // True if component set has variants with unbound properties, or individual component has unbound properties
}

interface PageProgress {
  name: string
  status: 'pending' | 'loading' | 'complete' | 'error'
  componentCount: number
}

interface PageData {
  pageName: string
  components: ComponentAuditData[]
  isExpanded: boolean
  displayedCount: number
}

interface QuickScanData {
  totalPages: number
  pagesWithComponents: number
  uniqueComponents: number
  totalVariants: number
  withoutDescription: number
  withoutDocs: number
  totalUnboundProperties: number
  hiddenComponents: number
}

const XIcon = ({ color = "#F44336", size = 16 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>`}
  />
)

const CircleCheckIcon = ({ color = "#00C853", size = 16 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>`}
  />
)

const ExternalLinkIcon = ({ color = "#666666", size = 12 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 3h6v6"/>
      <path d="M10 14 21 3"/>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    </svg>`}
  />
)

const ChevronDownIcon = ({ color = "#666666", size = 12 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>`}
  />
)

const ChevronRightIcon = ({ color = "#666666", size = 12 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>`}
  />
)

const QuickScanIcon = ({ color = "#69008C", size = 20 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 6H3"/>
      <path d="M10 12H3"/>
      <path d="M10 18H3"/>
      <circle cx="17" cy="15" r="3"/>
      <path d="m21 19-1.9-1.9"/>
    </svg>`}
  />
)

const CurrentPageIcon = ({ color = "#1976D2", size = 20 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h4"/>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
      <path d="M16 14a2 2 0 0 0-2 2"/>
      <path d="M20 14a2 2 0 0 1 2 2"/>
      <path d="M20 22a2 2 0 0 0 2-2"/>
      <path d="M16 22a2 2 0 0 1-2-2"/>
    </svg>`}
  />
)

const EntireDocumentIcon = ({ color = "#F57C00", size = 20 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <path d="M7 8h8"/>
      <path d="M7 12h10"/>
      <path d="M7 16h6"/>
    </svg>`}
  />
)

// Component Set Icon (Dashed border frame with center diamond)
const ComponentSetIcon = ({ color = "#000000", size = 16 }: { color?: string, size?: number }) => (
  <SVG 
    src={`<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_17_5465)">
<path d="M1 14C1 14.5523 1.44772 15 2 15H3.5V16H2C0.895431 16 0 15.1046 0 14V12.5H1V14Z" fill="${color}"/>
<path d="M9.5 16H6.5V15H9.5V16Z" fill="${color}"/>
<path d="M16 14C16 15.1046 15.1046 16 14 16H12.5V15H14C14.5523 15 15 14.5523 15 14V12.5H16V14Z" fill="${color}"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 8.60254C7.77597 8.32655 8.22403 8.32655 8.5 8.60254L9.66992 9.77344C9.94584 10.0494 9.94589 10.4965 9.66992 10.7725L8.5 11.9434C8.22406 12.2193 7.77597 12.2193 7.5 11.9434L6.33008 10.7725C6.05411 10.4965 6.05412 10.0494 6.33008 9.77344L7.5 8.60254ZM6.88379 10.2725L8 11.3887L9.11523 10.2725L8 9.15625L6.88379 10.2725ZM9.27344 10.2314C9.27872 10.2446 9.2812 10.2585 9.28125 10.2725C9.28118 10.2441 9.27068 10.216 9.24902 10.1943L9.27344 10.2314ZM6.36426 9.96582C6.32346 10.0276 6.2968 10.0958 6.2832 10.166C6.30364 10.0609 6.35414 9.96031 6.43555 9.87891L6.36426 9.96582Z" fill="${color}"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M5.22754 6.33008C5.5035 6.05411 5.95059 6.05412 6.22656 6.33008L7.39746 7.5C7.67327 7.77587 7.67311 8.22305 7.39746 8.49902L6.22656 9.66992C5.95062 9.94583 5.50351 9.94579 5.22754 9.66992L4.05664 8.5C3.78068 8.22404 3.78068 7.77596 4.05664 7.5L5.22754 6.33008ZM5.76855 9.27344C5.75511 9.27886 5.74084 9.2813 5.72656 9.28125C5.75529 9.28143 5.78374 9.27094 5.80566 9.24902L5.76855 9.27344ZM4.61133 8L5.72656 9.11523L6.84277 8L5.72656 6.88379L4.61133 8ZM6.0332 6.36426C6.06419 6.38468 6.09382 6.40828 6.12109 6.43555C6.06669 6.38114 6.00363 6.34062 5.93652 6.31348L6.0332 6.36426Z" fill="${color}"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M9.77344 6.33008C10.0494 6.05413 10.4965 6.05412 10.7725 6.33008L11.9434 7.5C12.2192 7.77597 12.2193 8.22406 11.9434 8.5L10.7725 9.66992C10.4965 9.94583 10.0494 9.94578 9.77344 9.66992L8.60254 8.5C8.32661 8.22404 8.32661 7.77596 8.60254 7.5L9.77344 6.33008ZM10.2305 9.27344C10.2439 9.27896 10.2581 9.28219 10.2725 9.28223C10.2442 9.28211 10.216 9.2706 10.1943 9.24902L10.2305 9.27344ZM9.15625 8L10.2725 9.11523L11.3887 8L10.2725 6.88379L9.15625 8ZM10.166 6.2832C10.0608 6.30357 9.96037 6.3541 9.87891 6.43555L9.9668 6.36426C10.0283 6.3237 10.0961 6.29679 10.166 6.2832Z" fill="${color}"/>
<path d="M1 9.5H0V6.5H1V9.5Z" fill="${color}"/>
<path d="M16 9.5H15V6.5H16V9.5Z" fill="${color}"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 4.05664C7.77597 3.78068 8.22403 3.78068 8.5 4.05664L9.66992 5.22754C9.94584 5.50351 9.94588 5.95062 9.66992 6.22656L8.5 7.39746C8.25861 7.63885 7.88559 7.66919 7.61133 7.48828L7.50098 7.39746L6.33008 6.22656C6.05412 5.9506 6.05412 5.5035 6.33008 5.22754L7.5 4.05664ZM6.88379 5.72656L8 6.84277L9.11523 5.72656L8 4.61133L6.88379 5.72656ZM6.36426 6.03418C6.38457 6.06491 6.40848 6.09403 6.43555 6.12109L6.36426 6.03418C6.34394 6.00335 6.32703 5.96998 6.31348 5.93652L6.36426 6.03418Z" fill="${color}"/>
<path d="M3.5 1H2C1.44772 1 1 1.44772 1 2V3.5H0V2C0 0.895431 0.895431 0 2 0H3.5V1Z" fill="${color}"/>
<path d="M14 0C15.1046 0 16 0.895431 16 2V3.5H15V2C15 1.44772 14.5523 1 14 1H12.5V0H14Z" fill="${color}"/>
<path d="M9.5 1H6.5V0H9.5V1Z" fill="${color}"/>
</g>
<defs>
<clipPath id="clip0_17_5465">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>`}
  />
)

// Single Component Icon  
const ComponentIcon = ({ color = "#000000", size = 16 }: { color?: string, size?: number }) => (
  <SVG 
    src={`<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_17_5462)">
<path fill-rule="evenodd" clip-rule="evenodd" d="M3.30621 5.5061L0.969605 7.84269C0.882818 7.92948 0.882819 8.07019 0.969605 8.15697L3.30621 10.4936C3.39299 10.5804 3.53369 10.5804 3.62048 10.4936L5.95708 8.15697C6.04386 8.07019 6.04386 7.92948 5.95708 7.84269L3.62048 5.5061C3.53369 5.41931 3.39299 5.41931 3.30621 5.5061ZM7.21416 9.41404L4.87755 11.7507C4.44364 12.1845 4.44364 12.8881 4.87755 13.322L7.21416 15.6586C7.64808 16.0925 8.35159 16.0925 8.78551 15.6586L11.1221 13.322C11.556 12.8881 11.556 12.1845 11.1221 11.7507L8.78551 9.41404C8.35159 8.98009 7.64808 8.98009 7.21416 9.41404ZM7.21463 6.58609C7.21479 6.58625 7.21447 6.58593 7.21463 6.58609L4.87755 4.24901C4.44364 3.8151 4.44364 3.11158 4.87755 2.67766L7.21416 0.341062C7.64808 -0.0928541 8.35159 -0.0928541 8.78551 0.341062L11.1221 2.67766C11.556 3.11158 11.556 3.8151 11.1221 4.24901L8.78551 6.58562C8.35175 7.01938 7.64858 7.01954 7.21463 6.58609ZM6.58609 8.78504C6.58624 8.78489 6.58593 8.78519 6.58609 8.78504L4.24902 11.1221C3.8151 11.556 3.11158 11.556 2.67767 11.1221L0.341062 8.7855C-0.0928541 8.35159 -0.0928541 7.64807 0.341062 7.21416L2.67767 4.87756C3.11158 4.44364 3.8151 4.44364 4.24902 4.87756L6.58562 7.21416C7.01938 7.64792 7.01953 8.35108 6.58609 8.78504ZM5.50609 3.62047L7.8427 5.95708C7.92948 6.04387 8.07018 6.04387 8.15697 5.95708L10.4936 3.62047C10.5803 3.53369 10.5803 3.39299 10.4936 3.3062L8.15697 0.9696C8.07018 0.882818 7.92948 0.882818 7.8427 0.9696L5.50609 3.3062C5.41931 3.39299 5.41931 3.53369 5.50609 3.62047ZM11.7506 4.87756L9.414 7.21416C8.98014 7.64807 8.98014 8.35159 9.414 8.7855L11.7506 11.1221C12.1846 11.556 12.888 11.556 13.322 11.1221L15.6586 8.7855C16.0925 8.35159 16.0925 7.64807 15.6586 7.21416L13.322 4.87756C12.888 4.44364 12.1846 4.44364 11.7506 4.87756ZM12.3792 5.50609L10.0426 7.84269C9.95578 7.92948 9.95578 8.07019 10.0426 8.15697L12.3792 10.4936C12.466 10.5804 12.6067 10.5804 12.6935 10.4936L15.0301 8.15697C15.1168 8.07019 15.1168 7.92948 15.0301 7.84269L12.6935 5.50609C12.6067 5.41931 12.466 5.41931 12.3792 5.50609ZM10.4936 12.3792L8.15697 10.0426C8.07018 9.95582 7.92948 9.95582 7.8427 10.0426L5.50609 12.3792C5.41931 12.466 5.41931 12.6067 5.50609 12.6934L7.8427 15.03C7.92948 15.1169 8.07018 15.1169 8.15697 15.03L10.4936 12.6934C10.5803 12.6067 10.5803 12.466 10.4936 12.3792Z" fill="${color}" fill-opacity="0.9"/>
</g>
<defs>
<clipPath id="clip0_17_5462">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>`}
  />
)

const SettingsIcon = ({ color = "#666666", size = 16 }: { color?: string, size?: number }) => (
  <SVG
    src={`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`}
  />
)

interface SettingsState {
  showMissingDescription: boolean
  showMissingDocsLink: boolean
  showMissingVariables: boolean
  hideZeroValues: boolean
  showFillValues: boolean
  // Stroke group
  showStrokeColorValues: boolean
  showStrokeWeightValues: boolean
  // Text group
  showFontFamilyValues: boolean
  showFontSizeValues: boolean
  showLineHeightValues: boolean
  // Spacing group
  showPaddingValues: boolean
  showPaddingTopValues: boolean
  showPaddingRightValues: boolean
  showPaddingBottomValues: boolean
  showPaddingLeftValues: boolean
  showItemSpacingValues: boolean
  // Corner Radius group
  showAllCornersValues: boolean
  showTopLeftRadiusValues: boolean
  showTopRightRadiusValues: boolean
  showBottomLeftRadiusValues: boolean
  showBottomRightRadiusValues: boolean
  // Effects group
  showEffectValues: boolean
  showEffectColorValues: boolean
  showEffectValuesValues: boolean
  showAppearanceValues: boolean
}

function Widget() {
  const [auditData, setAuditData] = useSyncedState<ComponentAuditData[]>('auditData', [])
  const [quickScanData, setQuickScanData] = useSyncedState<QuickScanData | null>('quickScanData', null)
  const [isQuickScanning, setIsQuickScanning] = useSyncedState('isQuickScanning', false)
  const [isDeepScanning, setIsDeepScanning] = useSyncedState('isDeepScanning', false)
  const [lastScanTime, setLastScanTime] = useSyncedState('lastScanTime', '')
  const [currentPageOnly, setCurrentPageOnly] = useSyncedState('currentPageOnly', true)
  const [pageProgress, setPageProgress] = useSyncedState<PageProgress[]>('pageProgress', [])
  const [currentProgress, setCurrentProgress] = useSyncedState('currentProgress', '')
  const [expandedPages, setExpandedPages] = useSyncedState<string[]>('expandedPages', [])
  const [expandedComponents, setExpandedComponents] = useSyncedState<string[]>('expandedComponents', [])
  const [pageDisplayCounts, setPageDisplayCounts] = useSyncedState<Record<string, number>>('pageDisplayCounts', {})
  const [isProgressExpanded, setIsProgressExpanded] = useSyncedState('isProgressExpanded', true)
  const [isSettingsExpanded, setIsSettingsExpanded] = useSyncedState('isSettingsExpanded', false)
  const [isIndividualPropsExpanded, setIsIndividualPropsExpanded] = useSyncedState('isIndividualPropsExpanded', false)
  const [settings, setSettings] = useSyncedState<SettingsState>('settings', {
    showMissingDescription: true,
    showMissingDocsLink: true,
    showMissingVariables: true,
    hideZeroValues: false,
    showFillValues: true,
    // Stroke group
    showStrokeColorValues: true,
    showStrokeWeightValues: true,
    // Text group
    showFontFamilyValues: true,
    showFontSizeValues: true,
    showLineHeightValues: true,
    // Spacing group
    showPaddingValues: true,
    showPaddingTopValues: true,
    showPaddingRightValues: true,
    showPaddingBottomValues: true,
    showPaddingLeftValues: true,
    showItemSpacingValues: true,
    // Corner Radius group
    showAllCornersValues: true,
    showTopLeftRadiusValues: true,
    showTopRightRadiusValues: true,
    showBottomLeftRadiusValues: true,
    showBottomRightRadiusValues: true,
    // Effects group
    showEffectValues: true,
    showEffectColorValues: true,
    showEffectValuesValues: true,
    showAppearanceValues: false
  })

  const CHUNK_SIZE = 5
  const LOAD_MORE_SIZE = 10

  const getNodePath = (node: SceneNode, rootNode: SceneNode): string => {
    const path: string[] = []
    let current: SceneNode | null = node
    
    while (current && current !== rootNode && current.parent) {
      if (current.name) {
        path.unshift(current.name)
      }
      current = current.parent as SceneNode
    }
    
    return path.length > 0 ? path.join(' > ') : 'Root'
  }

  const formatColor = (color: RGB): string => {
    const r = Math.round(color.r * 255)
    const g = Math.round(color.g * 255)
    const b = Math.round(color.b * 255)
    return `rgb(${r}, ${g}, ${b})`
  }

  const checkForUnboundProperties = (node: ComponentNode): { hasUnbound: boolean; properties: UnboundProperty[] } => {
    const unboundProperties: UnboundProperty[] = [];

    const checkNodeForUnboundProps = (node: SceneNode, path: string = ''): void => {
      // Ensure we never create empty currentPath using safeText
      const safeName = safeText(node.name) !== 'N/A' ? safeText(node.name) : (node.type || 'Node');
      const currentPath = path ? `${path} > ${safeName}` : safeName;
      

      if ('fills' in node && node.fills && node.fills !== figma.mixed) {
        const fills = node.fills as readonly Paint[];
        fills.forEach((fill, index) => {
          if (fill.type === 'SOLID') {
            // Check for fill color variables - stored in boundVariables.fills array  
            const fillBindings = node.boundVariables && 
                                node.boundVariables.fills &&
                                Array.isArray(node.boundVariables.fills) &&
                                node.boundVariables.fills[index];
            const isBound = fillBindings && 
                           typeof fillBindings === 'object' &&
                           (fillBindings as any).type === 'VARIABLE_ALIAS';
            
            const hasStyle = 'fillStyleId' in node && 
                           node.fillStyleId && 
                           node.fillStyleId !== '';
            
            if (!isBound && !hasStyle) {
              unboundProperties.push({
                type: 'fill',
                property: fills.length > 1 ? `Fill ${index + 1}` : 'Fill',
                currentValue: safeText(formatColor(fill.color)),
                nodePath: safeText(currentPath),
                nodeId: node.id
              });
            }
          }
        });
      }

      // Stroke checking - report color and weight separately
      if ('strokes' in node && node.strokes && node.strokes.length > 0) {
        const hasVisibleStrokes = node.strokes.some((stroke: Paint) => stroke.visible !== false);
        
        if (hasVisibleStrokes) {
          // Check stroke colors
          node.strokes.forEach((stroke, originalIndex) => {
            if (stroke.visible === false) return;
            
            if (stroke.type === 'SOLID') {
              const strokeBindings = node.boundVariables && 
                                    node.boundVariables.strokes &&
                                    Array.isArray(node.boundVariables.strokes) &&
                                    node.boundVariables.strokes[originalIndex];
              const isColorBound = strokeBindings && 
                                  typeof strokeBindings === 'object' &&
                                  (strokeBindings as any).type === 'VARIABLE_ALIAS';
              
              const hasStyle = 'strokeStyleId' in node && 
                             node.strokeStyleId && 
                             node.strokeStyleId !== '';
              
              if (!isColorBound && !hasStyle) {
                const visibleStrokesCount = node.strokes.filter(s => s.visible !== false).length;
                unboundProperties.push({
                  type: 'stroke',
                  property: visibleStrokesCount > 1 ? `Stroke ${originalIndex + 1} Color` : 'Stroke Color',
                  currentValue: safeText(formatColor(stroke.color)),
                  nodePath: safeText(currentPath),
                  nodeId: node.id
                });
              }
            }
          });
          
          // Check stroke weight separately
          if ('strokeWeight' in node) {
            // Check if strokeWeight is a single value or mixed (individual values)
            if (typeof node.strokeWeight === 'number') {
              // Single stroke weight value - check both strokeWeight and individual sides
              // Figma can store uniform stroke weight variables as individual side properties
              const boundVar = node.boundVariables && node.boundVariables.strokeWeight;
              const isWeightBound = boundVar && 
                                   typeof boundVar === 'object' &&
                                   (boundVar as any).type === 'VARIABLE_ALIAS';
              
              // Also check if all individual sides have the same variable binding
              const topBound = node.boundVariables && (node.boundVariables as any).strokeTopWeight;
              const rightBound = node.boundVariables && (node.boundVariables as any).strokeRightWeight;
              const bottomBound = node.boundVariables && (node.boundVariables as any).strokeBottomWeight;
              const leftBound = node.boundVariables && (node.boundVariables as any).strokeLeftWeight;
              
              const hasIndividualBindings = (topBound || rightBound || bottomBound || leftBound);
              const allSidesBound = topBound && rightBound && bottomBound && leftBound &&
                                   topBound.type === 'VARIABLE_ALIAS' &&
                                   rightBound.type === 'VARIABLE_ALIAS' &&
                                   bottomBound.type === 'VARIABLE_ALIAS' &&
                                   leftBound.type === 'VARIABLE_ALIAS';
              
              if (!isWeightBound && !allSidesBound) {
                unboundProperties.push({
                  type: 'stroke',
                  property: 'Stroke Weight',
                  currentValue: safeText(`${node.strokeWeight}px`),
                  nodePath: safeText(currentPath),
                  nodeId: node.id
                });
              }
            } else if (node.strokeWeight === figma.mixed) {
              // Individual stroke weights - check each side
              const strokeSides = [
                { key: 'strokeTopWeight', name: 'Stroke Top Weight', value: (node as any).strokeTopWeight },
                { key: 'strokeRightWeight', name: 'Stroke Right Weight', value: (node as any).strokeRightWeight },
                { key: 'strokeBottomWeight', name: 'Stroke Bottom Weight', value: (node as any).strokeBottomWeight },
                { key: 'strokeLeftWeight', name: 'Stroke Left Weight', value: (node as any).strokeLeftWeight }
              ];
              
              strokeSides.forEach(side => {
                if (typeof side.value === 'number') {
                  const boundVar = node.boundVariables && (node.boundVariables as any)[side.key];
                  const isSideBound = boundVar && 
                                     typeof boundVar === 'object' &&
                                     (boundVar as any).type === 'VARIABLE_ALIAS';
                  
                  if (!isSideBound) {
                    unboundProperties.push({
                      type: 'stroke',
                      property: side.name,
                      currentValue: safeText(`${side.value}px`),
                      nodePath: safeText(currentPath),
                      nodeId: node.id
                    });
                  }
                }
              });
            }
          }
        }
      }

      if (node.type === 'TEXT') {
        const textNode = node as TextNode;
        
        const hasTextStyle = textNode.textStyleId && textNode.textStyleId !== '';
        
        if (!hasTextStyle) {
          const hasFontFamilyVar = textNode.boundVariables && textNode.boundVariables.fontFamily !== undefined;
          const hasFontSizeVar = textNode.boundVariables && textNode.boundVariables.fontSize !== undefined;
          const hasLineHeightVar = textNode.boundVariables && textNode.boundVariables.lineHeight !== undefined;
          
          if (!hasFontFamilyVar) {
            const fontFamilyValue = textNode.fontName !== figma.mixed ? 
              (textNode.fontName.family || 'Unknown Font') : 'Mixed';
            unboundProperties.push({
              type: 'text',
              property: 'Font Family',
              currentValue: safeText(fontFamilyValue),
              nodePath: safeText(currentPath),
              nodeId: node.id
            });
          }
          
          if (!hasFontSizeVar) {
            const fontSizeValue = textNode.fontSize !== figma.mixed ? 
              `${textNode.fontSize}px` : 'Mixed';
            unboundProperties.push({
              type: 'text',
              property: 'Font Size',
              currentValue: safeText(fontSizeValue),
              nodePath: safeText(currentPath),
              nodeId: node.id
            });
          }
          
          if (!hasLineHeightVar && textNode.lineHeight !== figma.mixed) {
            let lineHeightValue = '';
            
            if (typeof textNode.lineHeight === 'object') {
              if ('value' in textNode.lineHeight) {
                if (textNode.lineHeight.unit === 'PIXELS') {
                  lineHeightValue = `${textNode.lineHeight.value}px`;
                } else if (textNode.lineHeight.unit === 'PERCENT') {
                  lineHeightValue = `${textNode.lineHeight.value}%`;
                }
              } else if (textNode.lineHeight.unit === 'AUTO') {
                lineHeightValue = 'Auto';
              }
            } else if (typeof textNode.lineHeight === 'number') {
              lineHeightValue = `${textNode.lineHeight}`;
            }
            
            // Only add if we have a valid line height value
            if (textNode.lineHeight.unit !== 'AUTO' && lineHeightValue && lineHeightValue.trim()) {
              unboundProperties.push({
                type: 'text',
                property: 'Line Height',
                currentValue: safeText(lineHeightValue),
                nodePath: safeText(currentPath),
                nodeId: node.id
              });
            }
          }
        }
      }

      if ('cornerRadius' in node && node.cornerRadius !== undefined) {
        // Check if individual corner properties exist on the node
        // These exist as separate properties when corners have different values or individual variables
        const hasIndividualCorners = 'topLeftRadius' in node;
        
        if (hasIndividualCorners) {
          // Node has individual corner properties - check each one
          const corners = [
            { key: 'topLeftRadius', name: 'Top Left Radius', value: (node as any).topLeftRadius },
            { key: 'topRightRadius', name: 'Top Right Radius', value: (node as any).topRightRadius },
            { key: 'bottomLeftRadius', name: 'Bottom Left Radius', value: (node as any).bottomLeftRadius },
            { key: 'bottomRightRadius', name: 'Bottom Right Radius', value: (node as any).bottomRightRadius }
          ];
          
          corners.forEach(corner => {
            if (typeof corner.value === 'number' && corner.value >= 0) {
              const boundVar = node.boundVariables && (node.boundVariables as any)[corner.key];
              const hasCornerVar = boundVar && 
                                  typeof boundVar === 'object' &&
                                  boundVar.type === 'VARIABLE_ALIAS';
              
              if (!hasCornerVar) {
                unboundProperties.push({
                  type: 'cornerRadius',
                  property: corner.name,
                  currentValue: safeText(`${corner.value}px`),
                  nodePath: safeText(currentPath),
                  nodeId: node.id
                });
              }
            }
          });
        } else if (typeof node.cornerRadius === 'number' && node.cornerRadius >= 0) {
          // Unified corner radius (all corners same, no individual properties)
          const hasUnifiedCornerVar = node.boundVariables && 
                                     node.boundVariables['cornerRadius' as keyof typeof node.boundVariables] &&
                                     typeof node.boundVariables['cornerRadius' as keyof typeof node.boundVariables] === 'object' &&
                                     (node.boundVariables['cornerRadius' as keyof typeof node.boundVariables] as any).type === 'VARIABLE_ALIAS';
          
          if (!hasUnifiedCornerVar) {
            unboundProperties.push({
              type: 'cornerRadius',
              property: 'All Corners',
              currentValue: safeText(`${node.cornerRadius}px`),
              nodePath: safeText(currentPath),
              nodeId: node.id
            });
          }
        }
      }

      if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        const layoutNode = node as FrameNode;
        
        if ('layoutMode' in layoutNode && layoutNode.layoutMode !== 'NONE') {
          // Check for hardcoded itemSpacing values
          // Skip spacing checks if primaryAxisAlignItems is 'SPACE_BETWEEN' (indicates "auto" spacing)
          const isAutoSpacing = layoutNode.primaryAxisAlignItems === 'SPACE_BETWEEN';
          
          // Check gap property (newer Figma property for spacing between items)
          if ('gap' in layoutNode && typeof (layoutNode as any).gap === 'number' && !isAutoSpacing) {
            const gap = (layoutNode as any).gap;
            const boundVar = layoutNode.boundVariables && (layoutNode.boundVariables as any).gap;
            const hasGapVar = boundVar && 
                             typeof boundVar === 'object' &&
                             boundVar.type === 'VARIABLE_ALIAS';
            
            if (!hasGapVar) {
              unboundProperties.push({
                type: 'spacing',
                property: 'Gap',
                currentValue: safeText(`${gap}px`),
                nodePath: safeText(currentPath),
                nodeId: node.id
              });
            }
          }
          
          // Check itemSpacing property (older property, still used in some cases)
          if ('itemSpacing' in layoutNode && layoutNode.itemSpacing >= 0 && !isAutoSpacing) {
            const boundVar = layoutNode.boundVariables && layoutNode.boundVariables.itemSpacing;
            const hasItemSpacingVar = boundVar && 
                                     typeof boundVar === 'object' &&
                                     (boundVar as any).type === 'VARIABLE_ALIAS';
            
            if (!hasItemSpacingVar) {
              unboundProperties.push({
                type: 'spacing',
                property: 'Item Spacing',
                currentValue: safeText(`${layoutNode.itemSpacing}px`),
                nodePath: safeText(currentPath),
                nodeId: node.id
              });
            }
          }

          if ('paddingTop' in layoutNode) {
            const paddings = [
              { key: 'paddingTop', name: 'Padding Top', value: layoutNode.paddingTop },
              { key: 'paddingRight', name: 'Padding Right', value: layoutNode.paddingRight },
              { key: 'paddingBottom', name: 'Padding Bottom', value: layoutNode.paddingBottom },
              { key: 'paddingLeft', name: 'Padding Left', value: layoutNode.paddingLeft }
            ];
            
            paddings.forEach(padding => {
              if (padding.value >= 0) {
                const boundVar = layoutNode.boundVariables && 
                               layoutNode.boundVariables[padding.key as keyof typeof layoutNode.boundVariables];
                const hasPaddingVar = boundVar && 
                                     typeof boundVar === 'object' &&
                                     (boundVar as any).type === 'VARIABLE_ALIAS';
                if (!hasPaddingVar) {
                  unboundProperties.push({
                    type: 'spacing',
                    property: padding.name,
                    currentValue: safeText(`${padding.value}px`),
                    nodePath: safeText(currentPath),
                    nodeId: node.id
                  });
                }
              }
            });
          }
        }
      }

      if ('effects' in node && node.effects && node.effects.length > 0) {
        const hasEffectStyle = 'effectStyleId' in node && 
                              node.effectStyleId && 
                              node.effectStyleId !== '';
        
        if (!hasEffectStyle) {
          node.effects.forEach((effect, index) => {
            if (effect.visible !== false) {
              const effectLabel = node.effects.length > 1 ? `Effect ${index + 1}` : 'Effect';
              
              // Check effect.boundVariables for individual property bindings
              const effectBoundVars = (effect as any).boundVariables;
              
              if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
                const shadow = effect as DropShadowEffect | InnerShadowEffect;
                
                // Check if color is bound
                const isColorBound = effectBoundVars && 
                                    effectBoundVars.color &&
                                    effectBoundVars.color.type === 'VARIABLE_ALIAS';
                
                // Check if offsetX/offsetY are bound
                const isOffsetXBound = effectBoundVars && 
                                      effectBoundVars.offsetX &&
                                      effectBoundVars.offsetX.type === 'VARIABLE_ALIAS';
                const isOffsetYBound = effectBoundVars && 
                                      effectBoundVars.offsetY &&
                                      effectBoundVars.offsetY.type === 'VARIABLE_ALIAS';
                
                // Check if radius is bound
                const isRadiusBound = effectBoundVars && 
                                     effectBoundVars.radius &&
                                     effectBoundVars.radius.type === 'VARIABLE_ALIAS';
                
                // Check if spread is bound
                const isSpreadBound = effectBoundVars && 
                                     effectBoundVars.spread &&
                                     effectBoundVars.spread.type === 'VARIABLE_ALIAS';
                
                // Add color if not bound
                if (!isColorBound && 'color' in shadow && shadow.color) {
                  const color = shadow.color;
                  const colorValue = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a !== undefined ? color.a.toFixed(2) : 1})`;
                  unboundProperties.push({
                    type: 'effect',
                    property: `${effectLabel} Color`,
                    currentValue: safeText(colorValue),
                    nodePath: safeText(currentPath),
                    nodeId: node.id
                  });
                }
                
                // Add offset if not bound
                if (!isOffsetXBound || !isOffsetYBound) {
                  unboundProperties.push({
                    type: 'effect',
                    property: `${effectLabel} Offset`,
                    currentValue: safeText(`x: ${shadow.offset.x}, y: ${shadow.offset.y}`),
                    nodePath: safeText(currentPath),
                    nodeId: node.id
                  });
                }
                
                // Add blur if not bound
                if (!isRadiusBound) {
                  unboundProperties.push({
                    type: 'effect',
                    property: `${effectLabel} Blur`,
                    currentValue: safeText(`${shadow.radius}`),
                    nodePath: safeText(currentPath),
                    nodeId: node.id
                  });
                }
                
                // Add spread if not bound
                if (!isSpreadBound && shadow.spread !== undefined) {
                  unboundProperties.push({
                    type: 'effect',
                    property: `${effectLabel} Spread`,
                    currentValue: safeText(`${shadow.spread || 0}`),
                    nodePath: safeText(currentPath),
                    nodeId: node.id
                  });
                }
                
              } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
                const blur = effect as BlurEffect;
                
                // Check if radius is bound
                const isRadiusBound = effectBoundVars && 
                                     effectBoundVars.radius &&
                                     effectBoundVars.radius.type === 'VARIABLE_ALIAS';
                
                // Add blur if not bound
                if (!isRadiusBound) {
                  unboundProperties.push({
                    type: 'effect',
                    property: `${effectLabel} Blur`,
                    currentValue: safeText(`${blur.radius}`),
                    nodePath: safeText(currentPath),
                    nodeId: node.id
                  });
                }
              }
            }
          });
        }
      }


      // Check opacity property (layer transparency)
      // Note: We check ALL opacity values (including 100%) because a hardcoded 100% 
      // is still a hardcoded value that should potentially use a variable
      if ('opacity' in node && typeof node.opacity === 'number') {
        // Check if opacity is bound to a variable
        // boundVariables.opacity will be an object like { type: "VARIABLE_ALIAS", id: "VariableID:..." } if bound
        const boundVar = node.boundVariables && (node.boundVariables as any).opacity;
        const hasOpacityVar = boundVar && 
                             typeof boundVar === 'object' &&
                             boundVar.type === 'VARIABLE_ALIAS';
        
        // Report any opacity value that doesn't have a variable (including 100%)
        if (!hasOpacityVar) {
          unboundProperties.push({
            type: 'appearance',
            property: 'Opacity',
            currentValue: safeText(`${Math.round(node.opacity * 100)}%`),
            nodePath: safeText(currentPath),
            nodeId: node.id
          });
        }
      }

      if ('children' in node && node.children) {
        node.children.forEach(child => {
          checkNodeForUnboundProps(child, currentPath);
        });
      }
    };

    try {
      checkNodeForUnboundProps(node);
      return {
        hasUnbound: unboundProperties.length > 0,
        properties: unboundProperties
      };
    } catch (error) {
      console.error('Error checking unbound properties:', error);
      return { hasUnbound: false, properties: [] };
    }
  };

  const isHiddenFromPublishing = (name: string): boolean => {
    return name.startsWith('.') || name.startsWith('_')
  }

  const hasDescription = (component: ComponentNode): boolean => {
    return component.description !== undefined && component.description.trim() !== ''
  }

  const hasDocumentationLink = (component: ComponentNode): boolean => {
    return component.documentationLinks !== undefined && 
           component.documentationLinks.length > 0 &&
           component.documentationLinks.some(link => link.uri.trim() !== '')
  }

  const processPageComponentsQuick = (page: PageNode): ComponentAuditData[] => {
    const components = page.findAll(node => node.type === 'COMPONENT') as ComponentNode[]
    const safePageName = (page.name || '').trim() || 'Unnamed Page'
    const currentPageName = (figma.currentPage.name || '').trim() || 'Current Page'
    
    const result: ComponentAuditData[] = []
    const processedComponentSets = new Set<string>()
    
    components.forEach(component => {
      let componentSetName: string | undefined
      let variantProperties: Record<string, string> | undefined
      const displayName = (component.name || '').trim() || 'Unnamed Component'
      let isVariant = false

      if (component.parent && component.parent.type === 'COMPONENT_SET') {
        const componentSet = component.parent as ComponentSetNode
        componentSetName = (componentSet.name || '').trim() || undefined
        isVariant = true
        
        // Add component set entry if we haven't processed it yet
        if (componentSetName && !processedComponentSets.has(componentSet.id)) {
          processedComponentSets.add(componentSet.id)
          
          result.push({
            id: componentSet.id || 'unknown-component-set',
            name: componentSetName,
            pageName: safePageName,
            hasDescription: hasDescription(componentSet as any),
            hasDocumentationLink: hasDocumentationLink(componentSet as any),
            hasUnboundProperties: false, // Skip for quick scan
            unboundProperties: [], // Skip for quick scan
            isHiddenFromPublishing: isHiddenFromPublishing(componentSetName),
            isOnCurrentPage: safePageName === currentPageName,
            isComponentSet: true
          })
        }
        
        const variantString = (component.name || '').trim()
        if (variantString) {
          const properties: Record<string, string> = {}
          
          const pairs = variantString.split(',')
            .map(pair => pair.trim())
            .filter(pair => pair.length > 0 && pair.includes('='))
          
          pairs.forEach(pair => {
            const [key, value] = pair.split('=').map(part => part.trim())
            if (key && key.length > 0 && value && value.length > 0) {
              properties[key] = value
            }
          })
          
          if (Object.keys(properties).length > 0) {
            variantProperties = properties
          }
        }
      }

      // Add individual component/variant entry
      result.push({
        id: component.id || 'unknown-component',
        name: displayName,
        componentSetName,
        variantProperties,
        pageName: safePageName,
        hasDescription: hasDescription(component),
        hasDocumentationLink: hasDocumentationLink(component),
        hasUnboundProperties: false, // Skip for quick scan
        unboundProperties: [], // Skip for quick scan
        isHiddenFromPublishing: isHiddenFromPublishing(componentSetName || displayName),
        isOnCurrentPage: safePageName === currentPageName,
        isVariant
      })
    })
    
    // Post-process to determine which component sets should be expandable
    // For quick scan, we don't have unbound properties data, so component sets are not expandable
    return result.map(component => ({
      ...component,
      hasExpandableContent: component.hasUnboundProperties // Only individual components can be expanded in quick scan
    }))
  }

  const processPageComponents = (page: PageNode): ComponentAuditData[] => {
    const components = page.findAll(node => node.type === 'COMPONENT') as ComponentNode[]
    const componentSets = page.findAll(node => node.type === 'COMPONENT_SET') as ComponentSetNode[]
    const safePageName = (page.name || '').trim() || 'Unnamed Page'
    const currentPageName = (figma.currentPage.name || '').trim() || 'Current Page'
    
    const result: ComponentAuditData[] = []
    const processedComponentSets = new Set<string>()
    
    // First, process all individual components and identify component sets
    components.forEach(component => {
      let componentSetName: string | undefined
      let variantProperties: Record<string, string> | undefined
      let displayName = (component.name || '').trim() || 'Unnamed Component'
      let isVariant = false

      if (component.parent && component.parent.type === 'COMPONENT_SET') {
        const componentSet = component.parent as ComponentSetNode
        componentSetName = (componentSet.name || '').trim() || undefined
        isVariant = true
        
        // Add component set entry if we haven't processed it yet
        if (componentSetName && !processedComponentSets.has(componentSet.id)) {
          processedComponentSets.add(componentSet.id)
          
          result.push({
            id: componentSet.id || 'unknown-component-set',
            name: componentSetName,
            pageName: safePageName,
            hasDescription: hasDescription(componentSet as any), // ComponentSetNode has same description property
            hasDocumentationLink: hasDocumentationLink(componentSet as any), // ComponentSetNode has same documentationLinks property
            hasUnboundProperties: false, // Component sets don't have unbound properties directly
            unboundProperties: [],
            isHiddenFromPublishing: isHiddenFromPublishing(componentSetName),
            isOnCurrentPage: safePageName === currentPageName,
            isComponentSet: true
          })
        }
        
        const variantString = (component.name || '').trim()
        if (variantString) {
          const properties: Record<string, string> = {}
          
          const pairs = variantString.split(',')
            .map(pair => pair.trim())
            .filter(pair => pair.length > 0 && pair.includes('='))
          
          pairs.forEach(pair => {
            const [key, value] = pair.split('=').map(part => part.trim())
            if (key && key.length > 0 && value && value.length > 0) {
              properties[key] = value
            }
          })
          
          if (Object.keys(properties).length > 0) {
            variantProperties = properties
          }
        }
      }

      const unboundCheck = checkForUnboundProperties(component)

      // Add individual component/variant entry
      result.push({
        id: component.id || 'unknown-component',
        name: displayName,
        componentSetName,
        variantProperties,
        pageName: safePageName,
        hasDescription: hasDescription(component),
        hasDocumentationLink: hasDocumentationLink(component),
        hasUnboundProperties: unboundCheck.hasUnbound,
        unboundProperties: unboundCheck.properties,
        isHiddenFromPublishing: isHiddenFromPublishing(componentSetName || displayName),
        isOnCurrentPage: safePageName === currentPageName,
        isVariant
      })
    })
    
    // Post-process to determine which component sets should be expandable
    // A component set is expandable if any of its variants have unbound properties
    const componentSetExpandability = new Map<string, boolean>()
    
    result.forEach(component => {
      if (component.isVariant && component.componentSetName && component.hasUnboundProperties) {
        // Find the corresponding component set entry
        const componentSetEntry = result.find(c => c.isComponentSet && c.name === component.componentSetName)
        if (componentSetEntry) {
          componentSetExpandability.set(componentSetEntry.id, true)
        }
      }
    })
    
    // Update hasExpandableContent for all entries
    return result.map(component => ({
      ...component,
      hasExpandableContent: component.isComponentSet 
        ? componentSetExpandability.get(component.id) || false
        : component.hasUnboundProperties
    }))
  }

  const runQuickScan = async () => {
    setIsQuickScanning(true)
    setQuickScanData(null)

    try {
      setCurrentProgress('Running quick scan...')
      
      await figma.loadAllPagesAsync()
      const allPages = figma.root.children.filter(child => child.type === 'PAGE') as PageNode[]
      
      let allComponents: ComponentAuditData[] = []
      
      for (const page of allPages) {
        const pageComponents = processPageComponentsQuick(page)
        allComponents = [...allComponents, ...pageComponents]
      }

      // Calculate quick scan statistics
      const componentSets = new Set()
      const regularComponents = new Set()
      
      allComponents.forEach(component => {
        if (component.componentSetName) {
          componentSets.add(component.componentSetName)
    } else {
          regularComponents.add(component.name)
        }
      })

      const pagesWithComponents = new Set(allComponents.map(c => c.pageName)).size
      const uniqueComponents = componentSets.size + regularComponents.size
      const withoutDescription = allComponents.filter(c => !c.hasDescription).length
      const withoutDocs = allComponents.filter(c => !c.hasDocumentationLink).length
      const hiddenComponents = allComponents.filter(c => c.isHiddenFromPublishing).length

      const quickData: QuickScanData = {
        totalPages: allPages.length,
        pagesWithComponents,
        uniqueComponents,
        totalVariants: allComponents.length,
        withoutDescription,
        withoutDocs,
        totalUnboundProperties: 0, // Will be calculated in deep scan
        hiddenComponents
      }

      setQuickScanData(quickData)
      setLastScanTime(new Date().toUTCString())
      setCurrentProgress('Quick scan complete!')

    } catch (error) {
      console.error('Error during quick scan:', error)
      setCurrentProgress('Error occurred during quick scan')
    } finally {
      setIsQuickScanning(false)
      setTimeout(() => {
        setCurrentProgress('')
      }, 2000)
    }
  }



  const generateSummaryText = (): string => {
    if (!quickScanData) return ''
    
    return `Out of ${quickScanData.totalPages} pages, ${quickScanData.pagesWithComponents} have components. We found ${quickScanData.uniqueComponents} unique components and ${quickScanData.totalVariants} total variants. ${quickScanData.withoutDescription}/${quickScanData.totalVariants} components do not have a description set, and ${quickScanData.withoutDocs}/${quickScanData.totalVariants} components do not have a documentation link. ${quickScanData.hiddenComponents} components are hidden from publishing.`
  }

  const createSummaryFrame = async () => {
    if (!quickScanData) return

    try {
      // Create a frame for the summary
      const frame = figma.createFrame()
      frame.name = `Component audit summary - ${new Date().toLocaleDateString()}`
      frame.resize(400, 400)
      
      // Set frame background to match widget
      frame.fills = [{
        type: 'SOLID',
        color: { r: 1, g: 1, b: 1 }
      }]
      
      // Add stroke to match widget
      frame.strokes = [{
        type: 'SOLID',
        color: { r: 0.93, g: 0.93, b: 0.93 }
      }]
      frame.strokeWeight = 1
      frame.cornerRadius = 16
      
      // Add padding
      frame.paddingTop = 16
      frame.paddingBottom = 16
      frame.paddingLeft = 16
      frame.paddingRight = 16
      frame.layoutMode = 'VERTICAL'
      frame.itemSpacing = 16
      frame.primaryAxisSizingMode = 'AUTO'

      // Title and timestamp in same AutoLayout block
      const headerFrame = figma.createFrame()
      headerFrame.name = "Header"
      headerFrame.layoutMode = 'VERTICAL'
      headerFrame.itemSpacing = 4
      headerFrame.primaryAxisSizingMode = 'AUTO'
      headerFrame.counterAxisSizingMode = 'AUTO'
      headerFrame.fills = []
      headerFrame.resize(368, headerFrame.height)
      frame.appendChild(headerFrame)

      // Title - match widget styling
      const title = figma.createText()
      await figma.loadFontAsync({ family: "Inter", style: "Bold" })
      title.fontName = { family: "Inter", style: "Bold" }
      title.fontSize = 14
      title.characters = "🔍 Component audit"
      title.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      title.resize(368, title.height) // Fill container width (400 - 32px padding)
      headerFrame.appendChild(title)

      // Timestamp
      const timestamp = figma.createText()
      await figma.loadFontAsync({ family: "Inter", style: "Regular" })
      timestamp.fontName = { family: "Inter", style: "Regular" }
      timestamp.fontSize = 12
      timestamp.characters = `Generated on ${new Date().toUTCString()}`
      timestamp.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
      timestamp.resize(368, timestamp.height) // Fill container width
      headerFrame.appendChild(timestamp)

      // Summary text
      const summaryText = figma.createText()
      summaryText.fontName = { family: "Inter", style: "Regular" }
      summaryText.fontSize = 12
      summaryText.lineHeight = { unit: 'PIXELS', value: 18 }
      summaryText.characters = generateSummaryText()
      summaryText.fills = [{ type: 'SOLID', color: { r: 0.133, g: 0.133, b: 0.133 } }]
      summaryText.textAutoResize = 'WIDTH_AND_HEIGHT'
      summaryText.resize(368, summaryText.height) // Fill container width
      frame.appendChild(summaryText)

      // Statistics breakdown
      const statsFrame = figma.createFrame()
      statsFrame.name = "Statistics"
      statsFrame.layoutMode = 'VERTICAL'
      statsFrame.itemSpacing = 12
      statsFrame.primaryAxisSizingMode = 'AUTO'
      statsFrame.counterAxisSizingMode = 'AUTO'
      statsFrame.fills = [{
        type: 'SOLID',
        color: { r: 0.98, g: 0.95, b: 1 }
      }]
      statsFrame.cornerRadius = 16
      statsFrame.paddingTop = 12
      statsFrame.paddingBottom = 12
      statsFrame.paddingLeft = 12
      statsFrame.paddingRight = 12
      statsFrame.resize(368, statsFrame.height) // Fill container width

      const statsTitle = figma.createText()
      statsTitle.fontName = { family: "Inter", style: "Bold" }
      statsTitle.fontSize = 14
      statsTitle.characters = "📊 Detailed Breakdown"
      statsTitle.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0, b: 0.55 } }]
      statsFrame.appendChild(statsTitle)

      // Create individual stat items
      const stats = [
        { label: "Total Pages", value: quickScanData.totalPages.toString(), color: { r: 0.55, g: 0, b: 0.55 } },
        { label: "Pages with Components", value: quickScanData.pagesWithComponents.toString(), color: { r: 0.55, g: 0, b: 0.55 } },
        { label: "Unique Components", value: quickScanData.uniqueComponents.toString(), color: { r: 0.55, g: 0, b: 0.55 } },
        { label: "Total Variants", value: quickScanData.totalVariants.toString(), color: { r: 0.55, g: 0, b: 0.55 } },
        { label: "Missing Descriptions", value: `${quickScanData.withoutDescription}/${quickScanData.totalVariants}`, color: { r: 0.96, g: 0.26, b: 0.21 } },
        { label: "Missing Documentation", value: `${quickScanData.withoutDocs}/${quickScanData.totalVariants}`, color: { r: 0.96, g: 0.26, b: 0.21 } },
        { label: "Hidden Components", value: quickScanData.hiddenComponents.toString(), color: { r: 0.55, g: 0, b: 0.55 } }
      ]

      for (const stat of stats) {
        const statRow = figma.createFrame()
        statRow.layoutMode = 'HORIZONTAL'
        statRow.itemSpacing = 8
        statRow.primaryAxisSizingMode = 'AUTO'
        statRow.counterAxisSizingMode = 'AUTO'
        statRow.fills = []

        const statLabel = figma.createText()
        statLabel.fontName = { family: "Inter", style: "Regular" }
        statLabel.fontSize = 12
        statLabel.characters = stat.label + ":"
        statLabel.fills = [{ type: 'SOLID', color: { r: 0.55, g: 0, b: 0.55 } }]
        statLabel.resize(200, statLabel.height)
        statRow.appendChild(statLabel)

        const statValue = figma.createText()
        statValue.fontName = { family: "Inter", style: "Bold" }
        statValue.fontSize = 12
        statValue.characters = stat.value
        statValue.fills = [{ type: 'SOLID', color: stat.color }]
        statRow.appendChild(statValue)

        statsFrame.appendChild(statRow)
      }

      frame.appendChild(statsFrame)

      // Position the frame to the right of the widget with some spacing
      // Widget is 640px wide, so place frame 700px to the right to give some gap
      frame.x = figma.viewport.center.x + 400
      frame.y = figma.viewport.center.y

      // Select the frame so user can see it
      figma.currentPage.selection = [frame]
      figma.viewport.scrollAndZoomIntoView([frame])

    } catch (error) {
      console.error('Error creating summary frame:', error)
    }
  }

  const toggleComponentExpansion = (componentId: string) => {
    if (expandedComponents.includes(componentId)) {
      setExpandedComponents(expandedComponents.filter(id => id !== componentId))
    } else {
      setExpandedComponents([...expandedComponents, componentId])
    }
  }

  const loadMoreComponents = (pageName: string) => {
    const currentCount = pageDisplayCounts[pageName] || CHUNK_SIZE
    const newCount = currentCount + LOAD_MORE_SIZE
    
    setPageDisplayCounts({
      ...pageDisplayCounts,
      [pageName]: newCount
    })
  }

  const filterUnboundPropertiesWithZeroValues = (properties: UnboundProperty[]): UnboundProperty[] => {
    return properties.filter(prop => {
      // Granular filtering based on property type and property name
      let shouldShow = false
      
      switch (prop.type) {
        case 'fill':
          shouldShow = settings.showFillValues
          break
        case 'stroke':
          // Check if it's stroke color or stroke weight
          if (prop.property.includes('Weight')) {
            shouldShow = settings.showStrokeWeightValues
          } else {
            shouldShow = settings.showStrokeColorValues
          }
          break
        case 'text':
          // Check specific text property
          if (prop.property === 'Font Family') {
            shouldShow = settings.showFontFamilyValues
          } else if (prop.property === 'Font Size') {
            shouldShow = settings.showFontSizeValues
          } else if (prop.property === 'Line Height') {
            shouldShow = settings.showLineHeightValues
          } else {
            // Default for any other text properties
            shouldShow = settings.showFontFamilyValues || settings.showFontSizeValues || settings.showLineHeightValues
          }
          break
        case 'spacing':
          // Check specific spacing property
          if (prop.property === 'Padding Top') {
            shouldShow = settings.showPaddingTopValues
          } else if (prop.property === 'Padding Right') {
            shouldShow = settings.showPaddingRightValues
          } else if (prop.property === 'Padding Bottom') {
            shouldShow = settings.showPaddingBottomValues
          } else if (prop.property === 'Padding Left') {
            shouldShow = settings.showPaddingLeftValues
          } else if (prop.property === 'Item Spacing' || prop.property === 'Gap') {
            shouldShow = settings.showItemSpacingValues
          } else {
            // Default for any other spacing properties
            shouldShow = settings.showPaddingTopValues || 
                        settings.showPaddingRightValues || 
                        settings.showPaddingBottomValues || 
                        settings.showPaddingLeftValues || 
                        settings.showItemSpacingValues
          }
          break
        case 'cornerRadius':
          // Check specific corner radius property
          if (prop.property === 'All Corners') {
            shouldShow = settings.showAllCornersValues
          } else if (prop.property === 'Top Left Radius') {
            shouldShow = settings.showTopLeftRadiusValues
          } else if (prop.property === 'Top Right Radius') {
            shouldShow = settings.showTopRightRadiusValues
          } else if (prop.property === 'Bottom Left Radius') {
            shouldShow = settings.showBottomLeftRadiusValues
          } else if (prop.property === 'Bottom Right Radius') {
            shouldShow = settings.showBottomRightRadiusValues
          } else {
            // Default for any other corner radius properties
            shouldShow = settings.showAllCornersValues || 
                        settings.showTopLeftRadiusValues || 
                        settings.showTopRightRadiusValues || 
                        settings.showBottomLeftRadiusValues || 
                        settings.showBottomRightRadiusValues
          }
          break
        case 'effect':
          // Check specific effect property
          if (prop.property.includes('Color')) {
            shouldShow = settings.showEffectColorValues
          } else if (prop.property.includes('Offset') || 
                     prop.property.includes('Blur') || 
                     prop.property.includes('Spread')) {
            shouldShow = settings.showEffectValuesValues
          } else {
            // Effect type - show if any effect setting is on
            shouldShow = settings.showEffectValues || 
                        settings.showEffectColorValues || 
                        settings.showEffectValuesValues
          }
          break
        case 'appearance':
          shouldShow = settings.showAppearanceValues
          break
        default:
          shouldShow = true
      }
      
      if (!shouldShow) {
        return false
      }
      
      // Filter out zero values if that setting is enabled
      if (settings.hideZeroValues) {
        const value = (prop.currentValue || '').trim().toLowerCase()
        // Check if value is exactly "0" or starts with "0px", "0pt", "0rem", etc.
        if (value === '0' || value.match(/^0(px|pt|rem|em|%|\s)/)) {
          return false
        }
      }
      
      return true
    })
  }

  const shouldShowComponent = (component: ComponentAuditData): boolean => {
    // Check if any filters are active
    const hasActiveFilters = settings.showMissingDescription || 
                             settings.showMissingDocsLink || 
                             settings.showMissingVariables
    
    // If no filters are active, show nothing
    if (!hasActiveFilters) {
      return false
    }
    
    // When filters are active, component must match at least one active filter
    let matchesFilter = false
    
    if (settings.showMissingDescription && !component.hasDescription) {
      matchesFilter = true
    }
    
    if (settings.showMissingDocsLink && !component.hasDocumentationLink) {
      matchesFilter = true
    }
    
    if (settings.showMissingVariables) {
      if (settings.hideZeroValues) {
        // Check if there are non-zero unbound properties
        const filteredProperties = filterUnboundPropertiesWithZeroValues(component.unboundProperties)
        if (filteredProperties.length > 0) {
          matchesFilter = true
        }
      } else {
        // Check if there are any unbound properties
        if (component.hasUnboundProperties) {
          matchesFilter = true
        }
      }
    }
    
    return matchesFilter
  }

  const getPageData = (): PageData[] => {
    const pageGroups = auditData.reduce((acc, component) => {
      // Apply filter based on settings
      if (!shouldShowComponent(component)) return acc
      
      if (!acc[component.pageName]) {
        acc[component.pageName] = []
      }
      acc[component.pageName].push(component)
      return acc
    }, {} as Record<string, ComponentAuditData[]>)

    return Object.keys(pageGroups).map(pageName => ({
      pageName,
      components: pageGroups[pageName],
      isExpanded: expandedPages.includes(pageName),
      displayedCount: pageDisplayCounts[pageName] || CHUNK_SIZE
    }))
  }

  const togglePageExpansion = (pageName: string) => {
    if (expandedPages.includes(pageName)) {
      setExpandedPages(expandedPages.filter(p => p !== pageName))
    } else {
      setExpandedPages([...expandedPages, pageName])
      if (!pageDisplayCounts[pageName]) {
        setPageDisplayCounts({
          ...pageDisplayCounts,
          [pageName]: CHUNK_SIZE
        })
      }
    }
  }

const navigateToComponent = async (componentId: string, specificNodeId?: string) => {
  try {
    if (!currentPageOnly) {
      await figma.loadAllPagesAsync()
    }
    
    // If we have a specific node ID, try to navigate to that node instead
    const targetNodeId = specificNodeId || componentId
    const targetNode = await figma.getNodeByIdAsync(targetNodeId)
    
    if (targetNode && 'x' in targetNode) {
      // Select the specific node (only SceneNodes can be selected)
      figma.currentPage.selection = [targetNode as SceneNode]
      
      // Navigate to the specific node with comfortable zoom
      figma.viewport.scrollAndZoomIntoView([targetNode as SceneNode])
      
      // Show notification with node name and return instruction
      const nodeName = specificNodeId ? targetNode.name : safeText(targetNode.name)
      figma.notify(`${safeText(nodeName)} • Double-click widget layer to return`, {
        timeout: 60000
      })
    }
  } catch (error) {
    console.error('Error navigating to node:', error)
    figma.notify('Could not navigate to node')
  }
}

  const toggleScanScope = () => {
    setCurrentPageOnly(!currentPageOnly)
  }

  const resetAll = () => {
    setQuickScanData(null)
    setAuditData([])
    setLastScanTime('')
    setPageProgress([])
    setCurrentProgress('')
    setExpandedPages([])
    setExpandedComponents([])
    setPageDisplayCounts({})
    setIsSettingsExpanded(false)
    setIsIndividualPropsExpanded(false)
    setSettings({
      showMissingDescription: true,
      showMissingDocsLink: true,
      showMissingVariables: true,
      hideZeroValues: false,
      showFillValues: true,
      // Stroke group
      showStrokeColorValues: true,
      showStrokeWeightValues: true,
      // Text group
      showFontFamilyValues: true,
      showFontSizeValues: true,
      showLineHeightValues: true,
      // Spacing group
      showPaddingValues: true,
      showPaddingTopValues: true,
      showPaddingRightValues: true,
      showPaddingBottomValues: true,
      showPaddingLeftValues: true,
      showItemSpacingValues: true,
      // Corner Radius group
      showAllCornersValues: true,
      showTopLeftRadiusValues: true,
      showTopRightRadiusValues: true,
      showBottomLeftRadiusValues: true,
      showBottomRightRadiusValues: true,
      // Effects group
      showEffectValues: true,
      showEffectColorValues: true,
      showEffectValuesValues: true,
      showAppearanceValues: false
    })
  }

  const rescan = async () => {
    if (quickScanData && auditData.length === 0) {
      // If we only have quick scan data, re-run quick scan
      await runQuickScan()
    } else if (auditData.length > 0) {
      // If we have deep scan data, re-run the same scope
      if (currentPageOnly) {
        await runDeepScanCurrentPage()
      } else {
        await runDeepScanAllPages()
      }
    }
  }

  // Helper function to clean component data for serialization
  const cleanComponentData = (components: ComponentAuditData[]): ComponentAuditData[] => {
    try {
      return components.map((component, index) => {
        try {
          return {
            ...component,
            // Ensure all required properties have values
            id: (component.id || '').trim() || `generated-${index}`,
            name: (component.name || '').trim() || 'Unnamed Component',
            pageName: (component.pageName || '').trim() || 'Unknown Page',
            // Ensure all properties are serializable and have default values
            unboundProperties: component.unboundProperties?.map(prop => ({
              type: prop.type || 'unknown',
              property: (prop.property || '').trim() || 'Unknown Property',
              currentValue: (prop.currentValue || '').trim() || 'N/A',
              nodePath: (prop.nodePath || '').trim() || 'Unknown Path',
              nodeId: (prop.nodeId || '').trim() || undefined
            })) || [],
            // Ensure other optional properties have proper values
            componentSetName: component.componentSetName ? 
              (component.componentSetName.trim() || undefined) : undefined,
            variantProperties: component.variantProperties ? 
              (() => {
                const cleanedProps: Record<string, string> = {}
                for (const key in component.variantProperties) {
                  const value = component.variantProperties[key]
                  if (key && key.trim() && value && value.trim()) {
                    cleanedProps[key.trim()] = value.trim()
                  }
                }
                return Object.keys(cleanedProps).length > 0 ? cleanedProps : undefined
              })() : undefined
          }
        } catch (componentError) {
          console.error(`Error cleaning component at index ${index}:`, componentError, component)
          // Return a minimal valid component structure
          return {
            id: (component?.id || '').trim() || `error-${index}`,
            name: (component?.name || '').trim() || 'Error Component',
            pageName: (component?.pageName || '').trim() || 'Unknown Page',
            hasDescription: false,
            hasDocumentationLink: false,
            hasUnboundProperties: false,
            unboundProperties: [],
            isHiddenFromPublishing: false,
            isOnCurrentPage: false
          }
        }
      })
    } catch (error) {
      console.error('Error in cleanComponentData:', error)
      return []
    }
  }

  const QuickScanResults = () => {
    if (!quickScanData) return null

    return (
      <AutoLayout direction="vertical" spacing={12} padding={12} fill="#FAECFF" cornerRadius={16} width="fill-parent">
        {/* <Text fontSize={12} fontWeight={700}>Quick Scan Results</Text> */}
        <AutoLayout direction="horizontal" spacing={4} width="fill-parent" wrap={true}>
          <Text fontSize={16} fill="#8C00BA">Out</Text>
          <Text fontSize={16} fill="#8C00BA">of</Text>
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{safeText(quickScanData.totalPages)}</Text>
          <Text fontSize={16} fill="#8C00BA">pages,</Text>
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{safeText(quickScanData.pagesWithComponents)}</Text>
          <Text fontSize={16} fill="#8C00BA">have</Text>
          <Text fontSize={16} fill="#8C00BA">components.</Text>
          <Text fontSize={16} fill="#8C00BA">We</Text>
          <Text fontSize={16} fill="#8C00BA">found</Text>
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{safeText(quickScanData.uniqueComponents)}</Text>
          <Text fontSize={16} fill="#8C00BA">unique</Text>
          <Text fontSize={16} fill="#8C00BA">components</Text>
          <Text fontSize={16} fill="#8C00BA">and</Text>
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{safeText(quickScanData.totalVariants)}</Text>
          <Text fontSize={16} fill="#8C00BA">total</Text>
          <Text fontSize={16} fill="#8C00BA">variants.</Text>
          
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{safeText(quickScanData.withoutDescription)}/{safeText(quickScanData.totalVariants)}</Text>
          <Text fontSize={16} fill="#8C00BA">components</Text>
          <Text fontSize={16} fill="#8C00BA">do</Text>
          <Text fontSize={16} fill="#8C00BA">not</Text>
          <Text fontSize={16} fill="#8C00BA">have</Text>
          <Text fontSize={16} fill="#8C00BA">a</Text>
          <Text fontSize={16} fill="#8C00BA">description</Text>
          <Text fontSize={16} fill="#8C00BA">set,</Text>
          <Text fontSize={16} fill="#8C00BA">and</Text>
          
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{safeText(quickScanData.withoutDocs)}/{safeText(quickScanData.totalVariants)}</Text>
          <Text fontSize={16} fill="#8C00BA">components</Text>
          <Text fontSize={16} fill="#8C00BA">do</Text>
          <Text fontSize={16} fill="#8C00BA">not</Text>
          <Text fontSize={16} fill="#8C00BA">have</Text>
          <Text fontSize={16} fill="#8C00BA">a</Text>
          <Text fontSize={16} fill="#8C00BA">documentation</Text>
          <Text fontSize={16} fill="#8C00BA">link.</Text>
          
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{safeText(quickScanData.hiddenComponents)}</Text>
          <Text fontSize={16} fill="#8C00BA">components</Text>
          <Text fontSize={16} fill="#8C00BA">are</Text>
          <Text fontSize={16} fill="#8C00BA">hidden</Text>
          <Text fontSize={16} fill="#8C00BA">from</Text>
          <Text fontSize={16} fill="#8C00BA">publishing.</Text>
        </AutoLayout>

        <AutoLayout direction="horizontal" spacing={8} verticalAlignItems="center">
          <AutoLayout 
            fill="#EFBEFF"
            cornerRadius={8} 
            padding={{ vertical: 6, horizontal: 10 }} 
            stroke="#E498FF"
            strokeWidth={1}
            onClick={createSummaryFrame}
            hoverStyle={{ fill: "#FCF5FF", stroke: "#8C00BA" }}
          >
            <Text fontSize={12} fill="#69008C" fontWeight={600}>Add summary to the canvas</Text>
          </AutoLayout>
          
          {lastScanTime && (
            <Text fontSize={11} fill="#8C00BA">
              {`Scanned at ${safeText(lastScanTime)}`}
            </Text>
          )}
        </AutoLayout>
      </AutoLayout>
    )
  }

  const ProgressIndicator = () => {
    if (!isDeepScanning && pageProgress.length === 0) return null

    // Check if deep scan is complete
    const isDeepScanComplete = currentProgress.includes('Deep scan complete')
    const backgroundColor = isDeepScanComplete ? '#EFFFEC' : '#f5f5f5'
    const textColor = isDeepScanComplete ? '#106A00' : '#222'

    return (
      <AutoLayout direction="vertical" spacing={0} fill={backgroundColor} cornerRadius={16} width="fill-parent">
        {/* Title row - clickable to toggle accordion */}
        <AutoLayout 
          direction="horizontal" 
          spacing={8} 
          padding={12} 
          verticalAlignItems="center" 
          width="fill-parent"
          onClick={() => setIsProgressExpanded(!isProgressExpanded)}
          cornerRadius={16}
        >
          {isProgressExpanded ? (
            <ChevronDownIcon color={textColor} size={16} />
          ) : (
            <ChevronRightIcon color={textColor} size={16} />
          )}
          <Text fontSize={12} fontWeight={600} fill={textColor} width="fill-parent">
            {safeText(currentProgress) !== 'N/A' ? safeText(currentProgress) : 'Processing...'}
          </Text>
        </AutoLayout>
        
        {isProgressExpanded && (
          <AutoLayout direction="vertical" spacing={4} padding={{ left: 8, right: 12, bottom: 12 }} width="fill-parent">
        {pageProgress.length > 0 && (
              <>
            {(pageProgress || []).map((page, index) => (
              <AutoLayout key={`${safeText(page.name)}-${index}`} direction="horizontal" spacing={8} verticalAlignItems="center" width="fill-parent">
                    <AutoLayout direction="horizontal" spacing={2} verticalAlignItems="center">
                      <AutoLayout width={24} height={24} horizontalAlignItems="center" verticalAlignItems="center">
                        {page.status === 'pending' ? (
                          <Text fontSize={12}>⏳</Text>
                        ) : page.status === 'loading' ? (
                          <Text fontSize={12}>🔄</Text>
                        ) : page.status === 'complete' ? (
                          <CircleCheckIcon color={'#106A00'} />
                        ) : (
                          <XIcon />
                        )}
                      </AutoLayout>
                      <Text fontSize={12} width={150} fill="#106A00">{safeText(page.name)}</Text>
                    </AutoLayout>
                    <Text fontSize={12} fill="#106A00">
                  {page.status === 'complete' ? `${safeText(page.componentCount)} components` : 
                   page.status === 'loading' ? 'Loading...' :
                   page.status === 'error' ? 'Error' : 'Waiting...'}
                </Text>
              </AutoLayout>
            ))}
              </>
            )}
          </AutoLayout>
        )}
      </AutoLayout>
    )
  }

  const UnboundPropertiesDetail = ({ properties, componentId, isOnCurrentPage, settings }: { 
    properties: UnboundProperty[], 
    componentId: string, 
    isOnCurrentPage: boolean,
    settings: SettingsState
  }) => {
    try {
      if (!properties || properties.length === 0) return null

    // Apply zero value filter
    const filteredProperties = filterUnboundPropertiesWithZeroValues(properties)
    
    if (filteredProperties.length === 0) return null

    const groupedProperties = filteredProperties.reduce((acc, prop) => {
      const safeType = (prop.type || '').trim() || 'unknown'
      if (!acc[safeType]) {
        acc[safeType] = []
      }
      acc[safeType].push(prop)
      return acc
    }, {} as Record<string, UnboundProperty[]>)

    const typeLabels = {
      fill: '🎨 Colors (Fill)',
      stroke: '🖊️ Stroke Properties',
      text: '📝 Typography',
      cornerRadius: '📐 Corner Radius',
      spacing: '📏 Spacing',
      effect: '✨ Effects',
      appearance: '👁️ Appearance',
      unknown: '❓ Unknown Type'
    }

    return (
      <AutoLayout direction="vertical" spacing={12} width="fill-parent" padding={{ bottom: 12 }}>
        <Text fontSize={12} fontWeight={600} fill="#000">Properties without variables/styles</Text>
        
        {Object.keys(groupedProperties).map((type, typeIndex) => (
          <AutoLayout key={`type-${type}-${typeIndex}`} direction="vertical" spacing={8} width="fill-parent">
            <Text fontSize={11} fontWeight={600} fill="#000">
              {typeLabels[type as keyof typeof typeLabels] || safeText(`Unknown Type (${type})`)}
            </Text>
            <AutoLayout direction="vertical" spacing={8} width="fill-parent">
            {(groupedProperties[type] || []).map((prop, index) => {
              const safeProperty = safeText(prop.property)
              const safeCurrentValue = safeText(prop.currentValue)
              const safeNodePath = safeText(prop.nodePath)
              const targetNodeId = prop.nodeId || componentId  // Use specific node ID if available
              
              return (
                <AutoLayout 
                  key={`${safeText(type)}-${index}-${safeProperty}`} 
                  direction="vertical" 
                  spacing={4} 
                  padding={{ top: 8, right: 16, bottom: 8, left: 16 }} 
                  fill="#FFF2F2" 
                  cornerRadius={8} 
                  stroke="#FFD6D6"
                  width="fill-parent"
                  onClick={isOnCurrentPage ? () => navigateToComponent(componentId, targetNodeId) : undefined}
                  hoverStyle={isOnCurrentPage ? { 
                    fill: "#FFE5E5", 
                    stroke: "#FFC1C1" 
                  } : undefined}
                >
                  <AutoLayout direction="horizontal" spacing={8} width="fill-parent" verticalAlignItems="center">
                    <AutoLayout direction="vertical" spacing={4} width="fill-parent">
                      <AutoLayout direction="horizontal" spacing={8} width="fill-parent">
                        <Text fontSize={11} fill="#6A0000" width={160}>{safeProperty}:</Text>
                        <Text fontSize={11} fill="#6A0000">{safeCurrentValue}</Text>
                      </AutoLayout>
                    </AutoLayout>
                    {isOnCurrentPage && (
                      <AutoLayout width={20} height={20} horizontalAlignItems="center" verticalAlignItems="center">
                        <ExternalLinkIcon color="#6A0000" size={12} />
                      </AutoLayout>
                    )}
                  </AutoLayout>
                </AutoLayout>
              )
            })}
            </AutoLayout>
          </AutoLayout>
        ))}
      </AutoLayout>
    )
    } catch (error) {
      console.error('Error in UnboundPropertiesDetail:', error)
      return (
        <AutoLayout direction="vertical" spacing={8} padding={8} fill="#FFEBEE" cornerRadius={4} width="fill-parent">
          <Text fontSize={11} fill="#C62828">Error rendering unbound properties</Text>
      </AutoLayout>
    )
    }
  }

const SettingsPanel = ({ 
  settings, 
  setSettings,
  isIndividualPropsExpanded,
  setIsIndividualPropsExpanded
}: { 
  settings: SettingsState, 
  setSettings: (settings: SettingsState) => void,
  isIndividualPropsExpanded: boolean,
  setIsIndividualPropsExpanded: (value: boolean) => void
}) => {
  const toggleSetting = (key: keyof SettingsState) => {
    const newValue = !settings[key]
    const newSettings = { ...settings }
    
    // Handle hierarchical relationships for grouped settings
    
    // Stroke group - first checkbox acts as "toggle all"
    if (key === 'showStrokeColorValues') {
      // Parent: toggle all children in stroke group
      newSettings.showStrokeColorValues = newValue
      newSettings.showStrokeWeightValues = newValue
    } else if (key === 'showStrokeWeightValues') {
      // Child affects parent
      newSettings.showStrokeWeightValues = newValue
      if (!newValue) {
        newSettings.showStrokeColorValues = false
      } else {
        // Turn on parent only if all siblings are on
        newSettings.showStrokeColorValues = newSettings.showStrokeColorValues && newValue
      }
    }
    // Text group - first checkbox acts as "toggle all"
    else if (key === 'showFontFamilyValues') {
      // Parent: toggle all children in text group
      newSettings.showFontFamilyValues = newValue
      newSettings.showFontSizeValues = newValue
      newSettings.showLineHeightValues = newValue
    } else if (['showFontSizeValues', 'showLineHeightValues'].includes(key)) {
      // Child affects parent
      newSettings[key] = newValue
      if (!newValue) {
        newSettings.showFontFamilyValues = false
      } else {
        // Turn on parent only if all siblings are on
        const allTextOn = newSettings.showFontFamilyValues && 
                         newSettings.showFontSizeValues && 
                         newSettings.showLineHeightValues
        newSettings.showFontFamilyValues = allTextOn
      }
    }
    // Spacing group - "Auto layout" is parent of both spacing AND padding directions
    else if (key === 'showPaddingValues') {
      // Parent: toggle all children (spacing + padding directions)
      newSettings.showPaddingValues = newValue
      newSettings.showItemSpacingValues = newValue
      newSettings.showPaddingTopValues = newValue
      newSettings.showPaddingRightValues = newValue
      newSettings.showPaddingBottomValues = newValue
      newSettings.showPaddingLeftValues = newValue
    } else if (['showItemSpacingValues', 'showPaddingTopValues', 'showPaddingRightValues', 'showPaddingBottomValues', 'showPaddingLeftValues'].includes(key)) {
      // Child: update self and parent
      newSettings[key] = newValue
      // If turning off, turn off parent. If turning on, check if all siblings are on
      if (!newValue) {
        newSettings.showPaddingValues = false
      } else {
        const allSpacingOn = newSettings.showItemSpacingValues &&
                            newSettings.showPaddingTopValues && 
                            newSettings.showPaddingRightValues && 
                            newSettings.showPaddingBottomValues && 
                            newSettings.showPaddingLeftValues
        newSettings.showPaddingValues = allSpacingOn
      }
    }
    // Corner Radius group
    else if (key === 'showAllCornersValues') {
      // Parent: toggle all children
      newSettings.showAllCornersValues = newValue
      newSettings.showTopLeftRadiusValues = newValue
      newSettings.showTopRightRadiusValues = newValue
      newSettings.showBottomLeftRadiusValues = newValue
      newSettings.showBottomRightRadiusValues = newValue
    } else if (['showTopLeftRadiusValues', 'showTopRightRadiusValues', 'showBottomLeftRadiusValues', 'showBottomRightRadiusValues'].includes(key)) {
      // Child: update self and parent
      newSettings[key] = newValue
      // If turning off, turn off parent. If turning on, check if all siblings are on
      if (!newValue) {
        newSettings.showAllCornersValues = false
      } else {
        const allCornersOn = newSettings.showTopLeftRadiusValues && 
                            newSettings.showTopRightRadiusValues && 
                            newSettings.showBottomLeftRadiusValues && 
                            newSettings.showBottomRightRadiusValues
        newSettings.showAllCornersValues = allCornersOn
      }
    }
    // Effects group
    else if (key === 'showEffectValues') {
      // Parent: toggle all children
      newSettings.showEffectValues = newValue
      newSettings.showEffectColorValues = newValue
      newSettings.showEffectValuesValues = newValue
    } else if (['showEffectColorValues', 'showEffectValuesValues'].includes(key)) {
      // Child: update self and parent
      newSettings[key] = newValue
      // If turning off, turn off parent. If turning on, check if all siblings are on
      if (!newValue) {
        newSettings.showEffectValues = false
      } else {
        const allEffectsOn = newSettings.showEffectColorValues && 
                            newSettings.showEffectValuesValues
        newSettings.showEffectValues = allEffectsOn
      }
    } else {
      // No hierarchy, just toggle
      newSettings[key] = newValue
    }
    
    setSettings(newSettings)
  }
  
  // Helper component for simple checkboxes
  const SimpleCheckbox = ({ 
    checked, 
    label, 
    onClick,
    isFirst = false,
    isLast = false
  }: { 
    checked: boolean, 
    label: string, 
    onClick: () => void,
    isFirst?: boolean,
    isLast?: boolean
  }) => {
    // Calculate corner radius based on position
    let cornerRadius: number | { topLeft: number, topRight: number, bottomLeft: number, bottomRight: number }
    if (isFirst && isLast) {
      // Single item - all corners rounded
      cornerRadius = 10
    } else if (isFirst) {
      // First item - left corners rounded
      cornerRadius = { topLeft: 10, topRight: 0, bottomLeft: 10, bottomRight: 0 }
    } else if (isLast) {
      // Last item - right corners rounded
      cornerRadius = { topLeft: 0, topRight: 10, bottomLeft: 0, bottomRight: 10 }
    } else {
      // Middle item - no corners rounded
      cornerRadius = 0
    }
    
    // Determine fill color based on checked state and position
    let fillColor: string
    if (checked) {
      fillColor = "#E6FDE2" // Light green when checked
    } else if (isFirst) {
      fillColor = "#FFFFFF" // White for first item when unchecked
    } else {
      fillColor = "#F5F5F5" // Light gray for other items when unchecked
    }
    
    return (
      <AutoLayout 
        direction="horizontal" 
        spacing={4} 
        onClick={onClick}
        verticalAlignItems="center"
        padding={{ top: 4, left: 6, bottom: 4, right: 6 }}
        cornerRadius={cornerRadius}
        fill={fillColor}
        stroke="#fff"
        strokeWidth={1}
        height={32}
      >
      <AutoLayout 
        width={14} 
        height={14} 
        horizontalAlignItems="center" 
        verticalAlignItems="center"
      >
        {checked ? (
          <CircleCheckIcon size={14} color="#18A700" />
        ) : (
          <Rectangle 
            width={12} 
            height={12} 
            stroke="#999999" 
            strokeWidth={1} 
            cornerRadius={2}
            fill="#FFFFFF"
          />
        )}
      </AutoLayout>
      <Text fontSize={11} fill={checked ? "#106A00" : "#333333"} fontWeight={500}>{label}</Text>
    </AutoLayout>
    )
  }

  return (
    <AutoLayout direction="vertical" spacing={8} padding={{ left: 8, right: 12, top: 0, bottom: 12 }} width="fill-parent">
      {/* Top-level checkboxes */}
      <AutoLayout direction="horizontal" spacing={2} wrap={true} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
        <SimpleCheckbox 
          checked={settings.showMissingDescription} 
          label="Component description" 
          onClick={() => toggleSetting('showMissingDescription')}
          isFirst={true}
        />
        <SimpleCheckbox 
          checked={settings.showMissingDocsLink} 
          label="Documentation link" 
          onClick={() => toggleSetting('showMissingDocsLink')}
        />
        <SimpleCheckbox 
          checked={settings.showMissingVariables} 
          label="Variables" 
          onClick={() => toggleSetting('showMissingVariables')}
          isLast={true}
        />
      </AutoLayout>
      
      {/* Individual properties collapsible section */}
      <AutoLayout direction="vertical" spacing={8} width="fill-parent">
        {/* Collapsible header */}
        <AutoLayout 
          direction="horizontal" 
          spacing={6} 
          onClick={() => setIsIndividualPropsExpanded(!isIndividualPropsExpanded)}
          verticalAlignItems="center"
        >
          {isIndividualPropsExpanded ? (
            <ChevronDownIcon color="#333333" size={12} />
          ) : (
            <ChevronRightIcon color="#333333" size={12} />
          )}
          <Text fontSize={11} fontWeight={600} fill="#333333">Individual properties</Text>
        </AutoLayout>
        
        {isIndividualPropsExpanded && (
          <AutoLayout direction="vertical" spacing={8} width="hug-contents">
            {/* Fill, Opacity, Ignore "0" values */}
            <AutoLayout direction="horizontal" spacing={4} wrap={true} width="hug-contents">
              <AutoLayout direction="horizontal" spacing={1} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
                <SimpleCheckbox checked={settings.showFillValues} label="Fill" onClick={() => toggleSetting('showFillValues')} isFirst={true} isLast={true} />
              </AutoLayout>
              
              <AutoLayout direction="horizontal" spacing={1} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
                <SimpleCheckbox checked={settings.showAppearanceValues} label="Opacity" onClick={() => toggleSetting('showAppearanceValues')} isFirst={true} isLast={true} />
              </AutoLayout>
              
              <AutoLayout direction="horizontal" spacing={1} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
                <SimpleCheckbox 
                  checked={settings.hideZeroValues} 
                  label='Ignore "0" values' 
                  onClick={() => toggleSetting('hideZeroValues')}
                  isFirst={true}
                  isLast={true}
                />
              </AutoLayout>
            </AutoLayout>
            
            {/* Stroke group */}
            <AutoLayout direction="horizontal" spacing={1} wrap={true} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
              <SimpleCheckbox checked={settings.showStrokeColorValues} label="Stroke" onClick={() => toggleSetting('showStrokeColorValues')} isFirst={true} />
              <SimpleCheckbox checked={settings.showStrokeColorValues} label="Stroke color" onClick={() => toggleSetting('showStrokeColorValues')} />
              <SimpleCheckbox checked={settings.showStrokeWeightValues} label="Weight" onClick={() => toggleSetting('showStrokeWeightValues')} isLast={true} />
            </AutoLayout>
            
            {/* Text group */}
            <AutoLayout direction="horizontal" spacing={1} wrap={true} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
              <SimpleCheckbox checked={settings.showFontFamilyValues} label="Text" onClick={() => toggleSetting('showFontFamilyValues')} isFirst={true} />
              <SimpleCheckbox checked={settings.showFontFamilyValues} label="Family" onClick={() => toggleSetting('showFontFamilyValues')} />
              <SimpleCheckbox checked={settings.showFontSizeValues} label="Size" onClick={() => toggleSetting('showFontSizeValues')} />
              <SimpleCheckbox checked={settings.showLineHeightValues} label="Line height" onClick={() => toggleSetting('showLineHeightValues')} />
              <SimpleCheckbox checked={settings.showLineHeightValues} label="Letter spacing" onClick={() => toggleSetting('showLineHeightValues')} />
              <SimpleCheckbox checked={settings.showLineHeightValues} label="Paragraph spacing" onClick={() => toggleSetting('showLineHeightValues')} isLast={true} />
            </AutoLayout>
            
            {/* Auto layout / Spacing group */}
            <AutoLayout direction="horizontal" spacing={1} wrap={true} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
              <SimpleCheckbox checked={settings.showPaddingValues} label="Auto layout" onClick={() => toggleSetting('showPaddingValues')} isFirst={true} />
              <SimpleCheckbox checked={settings.showItemSpacingValues} label="Spacing" onClick={() => toggleSetting('showItemSpacingValues')} />
              <SimpleCheckbox checked={settings.showPaddingTopValues} label="Top" onClick={() => toggleSetting('showPaddingTopValues')} />
              <SimpleCheckbox checked={settings.showPaddingRightValues} label="Right" onClick={() => toggleSetting('showPaddingRightValues')} />
              <SimpleCheckbox checked={settings.showPaddingBottomValues} label="Bottom" onClick={() => toggleSetting('showPaddingBottomValues')} />
              <SimpleCheckbox checked={settings.showPaddingLeftValues} label="Left" onClick={() => toggleSetting('showPaddingLeftValues')} isLast={true} />
            </AutoLayout>
            
            {/* Corner radius group */}
            <AutoLayout direction="horizontal" spacing={1} wrap={true} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
              <SimpleCheckbox checked={settings.showAllCornersValues} label="Corner radius" onClick={() => toggleSetting('showAllCornersValues')} isFirst={true} />
              <SimpleCheckbox checked={settings.showTopLeftRadiusValues} label="Top Left" onClick={() => toggleSetting('showTopLeftRadiusValues')} />
              <SimpleCheckbox checked={settings.showTopRightRadiusValues} label="Top Right" onClick={() => toggleSetting('showTopRightRadiusValues')} />
              <SimpleCheckbox checked={settings.showBottomLeftRadiusValues} label="Bottom Left" onClick={() => toggleSetting('showBottomLeftRadiusValues')} />
              <SimpleCheckbox checked={settings.showBottomRightRadiusValues} label="Bottom Right" onClick={() => toggleSetting('showBottomRightRadiusValues')} isLast={true} />
            </AutoLayout>
            
            {/* Effects group */}
            <AutoLayout direction="horizontal" spacing={1} wrap={true} fill={"#F5F5F5"} stroke="#eee" strokeWidth={1} cornerRadius={12} padding={2} width="hug-contents">
              <SimpleCheckbox checked={settings.showEffectValues} label="Effects" onClick={() => toggleSetting('showEffectValues')} isFirst={true} />
              <SimpleCheckbox checked={settings.showEffectColorValues} label="Effect color" onClick={() => toggleSetting('showEffectColorValues')} />
              <SimpleCheckbox checked={settings.showEffectValuesValues} label="Effect values" onClick={() => toggleSetting('showEffectValuesValues')} isLast={true} />
            </AutoLayout>
          </AutoLayout>
        )}
      </AutoLayout>
    </AutoLayout>
  )
}

const ComponentTable = ({ components, displayedCount, settings }: { 
  components: ComponentAuditData[], 
  displayedCount: number,
  settings: SettingsState
}) => {
  
  // Filter and validate components before rendering
  const validComponents = (components || []).filter(component => 
    component && 
    component.id && 
    component.id.trim() && 
    component.name && 
    component.name.trim()
  )
  
  // Use filtered components 
  const visibleComponents = validComponents.slice(0, displayedCount)
  const hasMore = validComponents.length > displayedCount

  // Safety check - if too many components, show warning instead
  if (validComponents.length > 100) {
  return (
      <AutoLayout direction="vertical" spacing={8} padding={12} fill="#FFF3CD" width="fill-parent">
        <Text fontSize={12} fill="#856404" fontWeight={600}>
          ⚠️ Too many components ({validComponents.length})
        </Text>
        <Text fontSize={11} fill="#856404" width="fill-parent">
          This page has too many components to display safely. Consider scanning individual pages instead.
        </Text>
      </AutoLayout>
    )
  }

    return (
      <AutoLayout direction="vertical" width="fill-parent" stroke="#eee" strokeWidth={1}>

        <AutoLayout direction="horizontal" spacing={0} padding={{ vertical: 8, horizontal: 12 }} width="fill-parent" stroke="#eee" strokeWidth={1}>
          <AutoLayout width={260}><Text fontSize={11} fontWeight={600}>Component name</Text></AutoLayout>
          <AutoLayout width={70} horizontalAlignItems="center"><Text fontSize={11} fontWeight={600} horizontalAlignText="center">Description</Text></AutoLayout>
          <AutoLayout width={70} horizontalAlignItems="center"><Text fontSize={11} fontWeight={600} horizontalAlignText="center">Docs link</Text></AutoLayout>
          <AutoLayout width={70} horizontalAlignItems="center"><Text fontSize={11} fontWeight={600} horizontalAlignText="center">Variables</Text></AutoLayout>
          <AutoLayout width={24} horizontalAlignItems="center"><Text fontSize={11} fontWeight={600} horizontalAlignText="center">&nbsp;</Text></AutoLayout>
        </AutoLayout>
      
      {visibleComponents.map((component, index) => {
        const isExpanded = expandedComponents.includes(component.id)
        
        // Complete safety for all component properties
        const safeComponent = {
          id: (component.id || '').trim() || `component-${index}`,
          name: (component.name || '').trim() || 'Unnamed Component',
          componentSetName: component.componentSetName ? 
            (component.componentSetName.trim() || undefined) : undefined,
          pageName: (component.pageName || '').trim() || 'Unknown Page',
                      hasDescription: Boolean(component.hasDescription),
            hasDocumentationLink: Boolean(component.hasDocumentationLink),
            hasUnboundProperties: Boolean(component.hasUnboundProperties),
            unboundProperties: component.unboundProperties || [],
            isHiddenFromPublishing: Boolean(component.isHiddenFromPublishing),
            isOnCurrentPage: Boolean(component.isOnCurrentPage),
            isComponentSet: Boolean(component.isComponentSet),
            isVariant: Boolean(component.isVariant),
            hasExpandableContent: Boolean(component.hasExpandableContent),
          // Clean variant properties completely
          variantProperties: component.variantProperties ? (() => {
            const cleaned: Record<string, string> = {}
            for (const key in component.variantProperties) {
              const value = component.variantProperties[key]
              const cleanKey = (key || '').trim()
              const cleanValue = (value || '').trim()
              if (cleanKey && cleanValue) {
                cleaned[cleanKey] = cleanValue
              }
            }
            return Object.keys(cleaned).length > 0 ? cleaned : undefined
          })() : undefined
        }
          

          
          try {            
            return (
            <AutoLayout key={safeComponent.id} direction="vertical" spacing={0} width="fill-parent">
              <AutoLayout
                direction="horizontal" 
                spacing={0} 
                padding={{ 
                  top: 8, 
                  right: 8, 
                  bottom: 8, 
                  left: safeComponent.isVariant ? 34 : 12
                }} 
                fill={index % 2 === 0 ? "#FFFFFF" : "#FAFAFA"} 
                width="fill-parent"
                hoverStyle={{ fill: "#E3F2FD" }}
                verticalAlignItems="center"
              >
                <AutoLayout width={safeComponent.isVariant ? 238 : 260} direction="horizontal" spacing={8} verticalAlignItems="center">
                  {(() => {
                    // Check if there are any properties after filtering
                    const filteredProps = filterUnboundPropertiesWithZeroValues(safeComponent.unboundProperties)
                    const hasContentToShow = filteredProps.length > 0
                    
                    return hasContentToShow && safeComponent.hasExpandableContent && (
                      <AutoLayout 
                        width={16} 
                        height={16} 
                        horizontalAlignItems="center" 
                        verticalAlignItems="center"
                        onClick={() => toggleComponentExpansion(safeComponent.id)}
                        hoverStyle={{ fill: "#eee" }}
                        cornerRadius={2}
                      >
                        {isExpanded ? (
                          <ChevronDownIcon color="#333333" size={10} />
                        ) : (
                          <ChevronRightIcon color="#333333" size={10} />
                        )}
                      </AutoLayout>
                    )
                  })()}
                  
                  <AutoLayout 
                    direction="vertical" 
                    spacing={2} 
                    width="fill-parent"
                    onClick={safeComponent.isOnCurrentPage ? () => navigateToComponent(safeComponent.id) : undefined}
                    hoverStyle={safeComponent.isOnCurrentPage ? { opacity: 0.8 } : undefined}
                  >
                    {safeComponent.componentSetName ? (
                      <>
                        <AutoLayout direction="horizontal" spacing={6} verticalAlignItems="center" width="fill-parent">
                          {!safeComponent.isVariant && (
                            safeComponent.isComponentSet ? (
                              <ComponentSetIcon color={safeComponent.isOnCurrentPage ? "#1976D2" : "#000000"} size={12} />
                            ) : (
                              <ComponentIcon color={safeComponent.isOnCurrentPage ? "#1976D2" : "#000000"} size={12} />
                            )
                          )}
                          <Text fontSize={11} fill={safeComponent.isOnCurrentPage ? "#1976D2" : "#000000"} fontWeight={600} width="fill-parent">
                            {safeText(safeComponent.componentSetName)}
                          </Text>
                        </AutoLayout>
                        {safeComponent.variantProperties && (
                          <AutoLayout direction="vertical" spacing={1}>
                            {Object.keys(safeComponent.variantProperties).map(key => {
                              const value = safeComponent.variantProperties![key]
                              const displayText = `${safeText(key)}: ${safeText(value)}`
                              return (
                                <Text key={`${safeText(key)}-${safeText(value)}`} fontSize={10} fill="#333333">
                                  {displayText}
                                </Text>
                              )
                            })}
                          </AutoLayout>
                        )}
                        {safeComponent.isHiddenFromPublishing && (
                          <Text fontSize={9} fill="#222">Hidden from publishing</Text>
                        )}
                      </>
                    ) : (
                      <>
                        <AutoLayout direction="horizontal" spacing={6} verticalAlignItems="center" width="fill-parent">
                          {!safeComponent.isVariant && (
                            safeComponent.isComponentSet ? (
                              <ComponentSetIcon color={safeComponent.isOnCurrentPage ? "#1976D2" : "#000000"} size={12} />
                            ) : (
                              <ComponentIcon color={safeComponent.isOnCurrentPage ? "#1976D2" : "#000000"} size={12} />
                            )
                          )}
                          <Text fontSize={11} fill={safeComponent.isOnCurrentPage ? "#1976D2" : "#000000"} fontWeight={600} width="fill-parent">
                            {safeText(safeComponent.name)}
                          </Text>
                        </AutoLayout>
                        {safeComponent.isHiddenFromPublishing && (
                          <Text fontSize={9} fill="#222">Hidden from publishing</Text>
                        )}
                      </>
                    )}
                  </AutoLayout>
                </AutoLayout>
                
                <AutoLayout horizontalAlignItems="center" verticalAlignItems="center" height={24} width={70}>
                  {safeComponent.hasDescription ? (
                    <CircleCheckIcon />
                  ) : (
                    <XIcon />
                  )}
                </AutoLayout>
                
                <AutoLayout horizontalAlignItems="center" verticalAlignItems="center" height={24} width={70}>
                  {safeComponent.hasDocumentationLink ? (
                    <CircleCheckIcon />
                  ) : (
                    <XIcon />
                  )}
                </AutoLayout>
                
                <AutoLayout horizontalAlignItems="center" verticalAlignItems="center" height={24} width={70}>
                  <AutoLayout direction="horizontal" spacing={4} verticalAlignItems="center">
                    {(() => {
                      const filteredCount = filterUnboundPropertiesWithZeroValues(safeComponent.unboundProperties).length
                      const hasFilteredProps = filteredCount > 0
                      return (
                        <>
                          {hasFilteredProps ? (
                            <XIcon />
                          ) : (
                            <CircleCheckIcon />
                          )}
                          {hasFilteredProps && (
                            <Text fontSize={10} fill="#F44336" fontWeight={600}>
                              {safeText(filteredCount)}
                            </Text>
                          )}
                        </>
                      )
                    })()}
                  </AutoLayout>
                </AutoLayout>
                
                {safeComponent.isOnCurrentPage && (
                  <AutoLayout 
                    horizontalAlignItems="center" 
                    verticalAlignItems="center" 
                    width={24}
                    height={24}
                    onClick={() => navigateToComponent(safeComponent.id)}
                    hoverStyle={{ fill: "#F0F0F0" }}
                    cornerRadius={16}
                  >
                    <ExternalLinkIcon size={12} />
                  </AutoLayout>
                )}
              </AutoLayout>
              
              {isExpanded && safeComponent.hasUnboundProperties && (() => {
                // Check if there are any properties after filtering
                const filteredProps = filterUnboundPropertiesWithZeroValues(safeComponent.unboundProperties)
                
                // Only render the container if there are filtered properties
                if (filteredProps.length === 0) return null
                
                return (
                  <AutoLayout 
                    direction="vertical" 
                    spacing={0} 
                    padding={{ vertical: 0, horizontal: 12 }}
                    fill={index % 2 === 0 ? "#FFFFFF" : "#FAFAFA"}
                    width="fill-parent"
                  >
                    <UnboundPropertiesDetail 
                      properties={safeComponent.unboundProperties} 
                      componentId={safeComponent.id}
                      isOnCurrentPage={safeComponent.isOnCurrentPage}
                      settings={settings}
                    />
                  </AutoLayout>
                )
              })()}
            </AutoLayout>
          )
          } catch (error) {
            console.error('Error rendering component:', safeComponent?.id || 'unknown', error)
            return (
              <AutoLayout key={`error-${index}`} direction="vertical" spacing={4} padding={8} fill="#FFEBEE" cornerRadius={4} width="fill-parent">
                <Text fontSize={11} fill="#C62828">Error rendering component: {safeText(safeComponent?.name)}</Text>
              </AutoLayout>
            )
          }
        })}
{hasMore && (
  <AutoLayout 
    direction="horizontal" 
            spacing={4} 
    padding={16} 
            horizontalAlignItems="start" 
    verticalAlignItems="center"
    width="fill-parent"
            fill="#fff"
    onClick={() => loadMoreComponents(safeText(validComponents[0]?.pageName))}
            hoverStyle={{ fill: "#f0f0f0" }}
  >
            <Text fontSize={11} fill="#222" fontWeight={600}>
              {`Load more (${safeText(validComponents.length - displayedCount)} remaining)`}
    </Text>
            <Text fontSize={11} fill="#222">
      {`Showing ${safeText(displayedCount)} of ${safeText(validComponents.length)}`}
    </Text>
  </AutoLayout>
)}
    </AutoLayout>
  )
}

const PageAccordion = ({ pageData }: { pageData: PageData }) => {
  const componentSets = new Set()
  const regularComponents = new Set()
  
  pageData.components.forEach(component => {
    if (component.componentSetName) {
      const safeName = safeText(component.componentSetName)
      if (safeName !== 'N/A') {
        componentSets.add(safeName)
      }
    } else {
      const safeName = safeText(component.name)
      if (safeName !== 'N/A') {
        regularComponents.add(safeName)
      }
    }
  })

  const totalUniqueComponents = componentSets.size + regularComponents.size

  const stats = {
    total: pageData.components.length,
    unique: totalUniqueComponents,
    withDescription: pageData.components.filter(c => c.hasDescription).length,
    withDocumentationLink: pageData.components.filter(c => c.hasDocumentationLink).length,
    withUnboundProperties: pageData.components.filter(c => c.hasUnboundProperties).length,
      hidden: pageData.components.filter(c => c.isHiddenFromPublishing).length
  }

  return (
      <AutoLayout direction="vertical" spacing={0} width="fill-parent" stroke="#eee" cornerRadius={16}>
      <AutoLayout
        direction="horizontal"
          spacing={8}
        padding={12}
          fill="#f5f5f5"
        width="fill-parent"
        verticalAlignItems="center"
        onClick={() => togglePageExpansion(pageData.pageName)}
      >
                  {pageData.isExpanded ? (
          <ChevronDownIcon color="#333333" size={14} />
        ) : (
          <ChevronRightIcon color="#333333" size={14} />
        )}
        <AutoLayout direction="vertical" spacing={2} width="fill-parent">
            <Text fontSize={11} fontWeight={700}>
              {safeText(pageData.pageName)}
            </Text>
          <AutoLayout direction="horizontal" spacing={12}>
              <Text fontSize={11} fill="#333333">
                {`${safeText(stats.total)} ${stats.total === 1 ? 'variant' : 'variants'} (${safeText(stats.unique)} ${stats.unique === 1 ? 'component' : 'components'})`}
            </Text>
            </AutoLayout>
            <AutoLayout direction="horizontal" spacing={12}>
              <Text fontSize={11} fill="#000" fontWeight={400}>{`Description: ${safeText(stats.withDescription)}`}</Text>
              <Text fontSize={11} fill="#000" fontWeight={400}>{`Docs link: ${safeText(stats.withDocumentationLink)}`}</Text>
              <Text fontSize={11} fill="#000" fontWeight={400}>{`Unbound values: ${safeText(stats.withUnboundProperties)}`}</Text>
              <Text fontSize={11} fill="#000" fontWeight={400}>{`Hidden from publishing: ${safeText(stats.hidden)}`}</Text>
          </AutoLayout>
        </AutoLayout>
      </AutoLayout>
      {pageData.isExpanded && (
          <AutoLayout direction="vertical" spacing={0} width="fill-parent">
          <ComponentTable 
            components={pageData.components} 
            displayedCount={pageData.displayedCount}
            settings={settings}
          />
        </AutoLayout>
      )}
    </AutoLayout>
  )
}

  const toggleAllPages = (expand: boolean) => {
    if (expand) {
      const allPageNames = getPageData().map(p => p.pageName)
      setExpandedPages(allPageNames)
      
      const newDisplayCounts: Record<string, number> = {}
      allPageNames.forEach(pageName => {
        newDisplayCounts[pageName] = CHUNK_SIZE
      })
      setPageDisplayCounts({ ...pageDisplayCounts, ...newDisplayCounts })
    } else {
      setExpandedPages([])
    }
  }

  const LoadAllButton = ({ pageName, totalCount }: { pageName: string, totalCount: number }) => {
    const currentCount = pageDisplayCounts[pageName] || CHUNK_SIZE
    
    if (totalCount <= CHUNK_SIZE) return null
    
    return (
      <AutoLayout direction="horizontal" spacing={8} verticalAlignItems="center">
        <AutoLayout 
          fill="#FAECFF"
          cornerRadius={8} 
          padding={{ vertical: 4, horizontal: 8 }} 
          onClick={() => setPageDisplayCounts({
            ...pageDisplayCounts,
            [pageName]: totalCount
          })}
          hoverStyle={{ fill: "#EFC8FD" }}
        >
          <Text fontSize={10} fill="#8C00BA">{`Load all (${safeText(totalCount)}) (Figma may crash!)`}</Text>
        </AutoLayout>
        
        {currentCount < totalCount && (
          <AutoLayout 
            fill="#FAECFF"
            cornerRadius={8} 
            padding={{ vertical: 4, horizontal: 8 }} 
            onClick={() => setPageDisplayCounts({
              ...pageDisplayCounts,
              [pageName]: CHUNK_SIZE
            })}
            hoverStyle={{ fill: "#EFC8FD" }}
          >
            <Text fontSize={10} fill="#8C00BA">{`Reset to ${safeText(CHUNK_SIZE)}`}</Text>
          </AutoLayout>
        )}
      </AutoLayout>
    )
  }

  const runDeepScanWithScope = async (scanCurrentPageOnly: boolean) => {
    setIsDeepScanning(true)
    setAuditData([])
    setPageProgress([])
    setExpandedPages([])
    setExpandedComponents([])
    setPageDisplayCounts({})
    
    try {
      if (scanCurrentPageOnly) {
        setCurrentProgress('Deep scanning current page...')
        const currentPage = figma.currentPage
        const safeCurrentPageName = (currentPage.name || '').trim() || 'Current Page'
        
        setPageProgress([{
          name: safeCurrentPageName,
          status: 'loading',
          componentCount: 0
        }])

        const pageComponents = processPageComponents(currentPage)
        
        setPageProgress([{
          name: safeCurrentPageName,
          status: 'complete',
          componentCount: pageComponents.length
        }])

        // Clean and serialize the data before storing
        try {
          const cleanedComponents = cleanComponentData(pageComponents)
          setAuditData(cleanedComponents)
        } catch (dataError) {
          console.error(`Error setting audit data for current page:`, dataError)
          setAuditData([]) // Fallback to empty array
        }
        
        setExpandedPages([safeCurrentPageName])
        setPageDisplayCounts({ [safeCurrentPageName]: CHUNK_SIZE })
        setCurrentProgress(`Deep scan complete: Found ${pageComponents.length} components`)
        
      } else {
        setCurrentProgress('Deep scanning all pages...')
        
        await figma.loadAllPagesAsync()
        const allPages = figma.root.children.filter(child => child.type === 'PAGE') as PageNode[]
        
        const initialProgress: PageProgress[] = allPages.map((page, index) => ({
          name: (page.name || '').trim() || `Page ${index + 1}`,
          status: 'pending' as const,
          componentCount: 0
        }))
        setPageProgress(initialProgress)

        let allComponents: ComponentAuditData[] = []
        
        for (let i = 0; i < allPages.length; i++) {
          const page = allPages[i]
          const safePage = {
            ...page,
            name: (page.name || '').trim() || `Page ${i + 1}`
          }
          
          try {
            setCurrentProgress(`Deep scanning page ${i + 1}/${allPages.length}: ${safePage.name}`)
            setPageProgress(prev => prev.map(p => 
              p.name === safePage.name 
                ? { ...p, status: 'loading' }
                : p
            ))

            const pageComponents = processPageComponents(page)
            allComponents = [...allComponents, ...pageComponents]
            
            setPageProgress(prev => prev.map(p => 
              p.name === safePage.name 
                ? { ...p, status: 'complete', componentCount: pageComponents.length }
                : p
            ))

            // Clean and serialize the data before storing
            try {
              const cleanedComponents = cleanComponentData(allComponents)
              setAuditData(cleanedComponents)
            } catch (dataError) {
              console.error(`Error setting audit data for page ${safePage.name}:`, dataError)
              // Continue without updating audit data for this page
            }
            
            await new Promise(resolve => setTimeout(resolve, 200))
            
          } catch (error) {
            console.error(`Error processing page ${safePage.name}:`, error)
            setPageProgress(prev => prev.map(p => 
              p.name === safePage.name 
                ? { ...p, status: 'error', componentCount: 0 }
                : p
            ))
          }
        }

        setCurrentProgress(`Deep scan complete! Found ${allComponents.length} components across ${allPages.length} pages`)
      }

      setLastScanTime(new Date().toUTCString())
      
      // Auto-collapse the progress accordion after scan completes
      setTimeout(() => {
        setIsProgressExpanded(false)
      }, 1000)
        
    } catch (error) {
      console.error('Error during deep scan:', error)
      setCurrentProgress('Error occurred during deep scan')
    } finally {
      setIsDeepScanning(false)
      setTimeout(() => {
        setCurrentProgress('')
        setPageProgress([])
      }, 3000)
    }
  }

  const runDeepScanCurrentPage = async () => {
    setCurrentPageOnly(true)
    await runDeepScanWithScope(true)
  }

  const runDeepScanAllPages = async () => {
    try {
      // Step 1: Run quick scan first to ensure proper initialization
      setCurrentProgress('Initializing: Running quick scan...')
      await runQuickScan()
      
      // Wait a moment for quick scan to complete
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 2: Now run the deep scan
      setCurrentProgress('Starting deep scan of all pages...')
      setCurrentPageOnly(false)
      await runDeepScanWithScope(false)
    } catch (error) {
      console.error('Error in deep scan all pages:', error)
      setCurrentProgress('Error occurred during scan')
      setIsDeepScanning(false)
    }
  }


  return (
    <AutoLayout direction="vertical" spacing={16} padding={16} fill="#FFFFFF" cornerRadius={16} stroke="#eee" width={560} height="hug-contents">
      <AutoLayout direction="horizontal" spacing={12} width="fill-parent">
        <AutoLayout direction="vertical" spacing={4} width="fill-parent">
          <AutoLayout direction="horizontal" spacing={4} width="fill-parent" verticalAlignItems="center">
            <Text fontSize={12} fontWeight={700}>🔍</Text>
            <Text fontSize={16} fontWeight={700}>Component audit</Text>
          </AutoLayout>
          {!isQuickScanning && !isDeepScanning && auditData.length === 0 && (
            <Text fontSize={12} fill="#333" horizontalAlignText="center">
              Choose a scan type to analyze your components.
            </Text>
          )}
      </AutoLayout>
  
        {(quickScanData || auditData.length > 0) && (
          <AutoLayout direction="horizontal" spacing={8}>
            <AutoLayout 
              fill="#1976D2"
              cornerRadius={8} 
              padding={{ vertical: 4, horizontal: 8 }} 
              onClick={rescan}
              hoverStyle={{ fill: "#1565C0" }}
              width="hug-contents"
            >
              <Text fontSize={10} fill="#FFFFFF">Rescan</Text>
            </AutoLayout>
            <AutoLayout 
              fill="#F44336"
              cornerRadius={8} 
              padding={{ vertical: 4, horizontal: 8 }} 
              onClick={resetAll}
              hoverStyle={{ fill: "#D32F2F" }}
              width="hug-contents"
            >
              <Text fontSize={10} fill="#FFFFFF">Reset</Text>
            </AutoLayout>
          </AutoLayout>
        )}
      </AutoLayout>

    {/* Scan Options - Show all three when no scan is active or completed */}
    {!isQuickScanning && !isDeepScanning && auditData.length === 0 && (
      <AutoLayout direction="vertical" spacing={12} width="fill-parent">
        <AutoLayout direction="vertical" spacing={8} width="fill-parent">
          
          {/* Quick Scan Option */}
          <AutoLayout direction="vertical" spacing={8} padding={12} fill="#FAECFF" cornerRadius={16} width="fill-parent">
            <AutoLayout direction="vertical" spacing={4} width="fill-parent">
              <AutoLayout direction="horizontal" spacing={4} verticalAlignItems="center">
                <QuickScanIcon color="#8C00BA" size={16} />
                <Text fontSize={12} fontWeight={600} fill="#8C00BA">Quick scan</Text>
              </AutoLayout>
              <Text fontSize={11} fill="#8C00BA" width="fill-parent">
                Fast overview of all components across your document. Shows counts, missing descriptions, and documentation links.
              </Text>
            </AutoLayout>
            <AutoLayout 
              fill="#F3D0FF"
              cornerRadius={8} 
              padding={{ vertical: 6, horizontal: 10 }} 
              stroke="#CB3BFE"
              strokeWidth={1}
              onClick={runQuickScan}
              hoverStyle={{ fill: "#FAECFF" }}
              width="hug-contents"
            >
              <Text fontSize={12} fill="#6D138B" fontWeight={600}>Start quick scan</Text>
            </AutoLayout>
          </AutoLayout>

          {/* Current Page Deep Scan Option */}
          <AutoLayout direction="vertical" spacing={8} padding={12} fill="#F0F8FF" cornerRadius={16} width="fill-parent">
            <AutoLayout direction="vertical" spacing={4} width="fill-parent">
              <AutoLayout direction="horizontal" spacing={4} verticalAlignItems="center">
                <CurrentPageIcon color="#1976D2" size={16} />
                <Text fontSize={12} fontWeight={600} fill="#1976D2">Current page</Text>
              </AutoLayout>
              <Text fontSize={11} fill="#1976D2" width="fill-parent">
                Detailed analysis of components on the current page only. Includes unbound properties analysis.
              </Text>
            </AutoLayout>
            <AutoLayout 
              fill="#D0EBFF"
              cornerRadius={8} 
              padding={{ vertical: 6, horizontal: 10 }} 
              stroke="#2B94EB"
              strokeWidth={1}
              onClick={runDeepScanCurrentPage}
              hoverStyle={{ fill: "#F0F8FF" }}
              width="hug-contents"
            >
              <Text fontSize={12} fill="#0C4990" fontWeight={600}>Scan current page</Text>
            </AutoLayout>
          </AutoLayout>

          {/* All Pages Deep Scan Option */}
          <AutoLayout direction="vertical" spacing={8} padding={12} fill="#FFF3CD" cornerRadius={16} width="fill-parent">
            <AutoLayout direction="vertical" spacing={4} width="fill-parent">
              <AutoLayout direction="horizontal" spacing={4} verticalAlignItems="center">
                <EntireDocumentIcon color="#856404" size={16} />
                <Text fontSize={12} fontWeight={600} fill="#856404">Whole file</Text>
              </AutoLayout>
              <Text fontSize={11} fill="#856404" width="fill-parent">
                Complete analysis of all components across every page. May be slow and could crash Figma with large documents.
              </Text>
            </AutoLayout>
            <AutoLayout 
              fill="#FEE591"
              cornerRadius={8} 
              padding={{ vertical: 6, horizontal: 10 }} 
              stroke="#AA8000"
              strokeWidth={1}
              onClick={runDeepScanAllPages}
              hoverStyle={{ fill: "#FFF3CD" }}
              width="hug-contents"
            >
              <Text fontSize={12} fill="#5F4301" fontWeight={600}>Scan whole file</Text>
            </AutoLayout>
          </AutoLayout>
        </AutoLayout>
      </AutoLayout>
    )}

      {/* Progress for quick scan */}
      {isQuickScanning && currentProgress && currentProgress.trim() && (
        <AutoLayout direction="vertical" spacing={8} padding={12} fill="#F0F8FF" cornerRadius={16} width="fill-parent">
          <Text fontSize={12} fontWeight={600}>{currentProgress.trim()}</Text>
        </AutoLayout>
      )}

      {/* Quick Scan Results */}
      <QuickScanResults />

            {/* Deep Scan Results */}
      {auditData.length > 0 && (
        <>
        <AutoLayout direction="vertical" spacing={2} width="fill-parent">
            <AutoLayout width="fill-parent">
              <Text fontSize={14} fontWeight={600}>Deep analysis results</Text>
            </AutoLayout>
            <AutoLayout width="fill-parent">
              {lastScanTime && (
                <Text fontSize={11} fill="#333333">
                  {`Scanned: ${safeText(lastScanTime)} (${currentPageOnly ? 'current page' : 'all pages'})`}
        </Text>
      )}
            </AutoLayout>
          </AutoLayout>
  
          {/* Settings Panel */}
          <AutoLayout direction="vertical" spacing={0} width="fill-parent" fill="#f9f9f9" cornerRadius={12}>
            <AutoLayout 
              direction="horizontal" 
              spacing={8} 
              padding={12} 
              verticalAlignItems="center" 
              width="fill-parent"
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
            >
              {isSettingsExpanded ? (
                <ChevronDownIcon color="#333333" size={14} />
              ) : (
                <ChevronRightIcon color="#333333" size={14} />
              )}
              <Text fontSize={12} fontWeight={600} fill="#333333">Settings</Text>
            </AutoLayout>
            
            {isSettingsExpanded && (
              <SettingsPanel 
                settings={settings} 
                setSettings={setSettings}
                isIndividualPropsExpanded={isIndividualPropsExpanded}
                setIsIndividualPropsExpanded={setIsIndividualPropsExpanded}
              />
            )}
          </AutoLayout>
  
          {/* Progress for deep scan */}
          <ProgressIndicator />
  
          {/* Page controls */}
          {getPageData().length > 1 && (
        <AutoLayout direction="horizontal" spacing={8} verticalAlignItems="center">
          <AutoLayout 
                fill="#eee" 
                cornerRadius={6} 
                padding={{ vertical: 4, horizontal: 6 }} 
            onClick={() => toggleAllPages(true)}
                hoverStyle={{ fill: "#ddd" }}
          >
                <Text fontSize={10} fill="#333333">Expand all pages (Figma may crash!)</Text>
          </AutoLayout>
          <AutoLayout 
                fill="#eee" 
                cornerRadius={6} 
                padding={{ vertical: 4, horizontal: 6 }} 
            onClick={() => toggleAllPages(false)}
                hoverStyle={{ fill: "#ddd" }}
          >
                <Text fontSize={10} fill="#333333">Collapse all pages</Text>
          </AutoLayout>
        </AutoLayout>
      )}
  
                    {/* Page Accordions */}
          <AutoLayout direction="vertical" spacing={8} width="fill-parent">
      {(getPageData() || []).map((pageData, index) => (
        <AutoLayout key={`${safeText(pageData.pageName)}-${index}`} direction="vertical" spacing={8} width="fill-parent">
          <PageAccordion pageData={pageData} />
          {pageData.isExpanded && (
            <LoadAllButton 
              pageName={safeText(pageData.pageName)} 
              totalCount={pageData.components?.length || 0} 
            />
          )}
        </AutoLayout>
      ))}
        </AutoLayout>      
        </>
      )}  
    </AutoLayout>
  )
}

widget.register(Widget)