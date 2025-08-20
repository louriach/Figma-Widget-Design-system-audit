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
  type: 'fill' | 'stroke' | 'text' | 'cornerRadius' | 'spacing' | 'effect' | 'strokeWeight'
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
            const isBound = node.boundVariables && 
                           node.boundVariables.fills !== undefined;
            
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

      // Fixed stroke checking - only check if strokes exist AND are visible
      if ('strokes' in node && node.strokes && node.strokes.length > 0) {
        const visibleStrokes = node.strokes.filter(stroke => stroke.visible !== false);
        if (visibleStrokes.length > 0) {
          visibleStrokes.forEach((stroke, index) => {
          if (stroke.type === 'SOLID') {
            // Check for stroke color variables - stored in boundVariables.strokes array
            const isBound = node.boundVariables && 
                           node.boundVariables.strokes !== undefined;
            
            const hasStyle = 'strokeStyleId' in node && 
                           node.strokeStyleId && 
                             node.strokeStyleId !== '';
            
            if (!isBound && !hasStyle) {
              unboundProperties.push({
                type: 'stroke',
                  property: visibleStrokes.length > 1 ? `Stroke ${index + 1}` : 'Stroke',
                currentValue: safeText(formatColor(stroke.color)),
                nodePath: safeText(currentPath),
                nodeId: node.id
                });
            }
          }
          });
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
        if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
          const hasCornerRadiusVar = node.boundVariables && 
                                    node.boundVariables.topLeftRadius !== undefined;
          
          if (!hasCornerRadiusVar) {
            unboundProperties.push({
              type: 'cornerRadius',
              property: 'Corner Radius',
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
          
          if ('itemSpacing' in layoutNode && layoutNode.itemSpacing > 0 && !isAutoSpacing) {
            // Flag non-10px values without variables (10px = Figma's default "auto" value)
            if (layoutNode.itemSpacing !== 10) {
              const hasItemSpacingVar = layoutNode.boundVariables && 
                                       layoutNode.boundVariables.itemSpacing !== undefined;
              
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
          }

          if ('paddingTop' in layoutNode) {
            const paddings = [
              { key: 'paddingTop', name: 'Padding Top', value: layoutNode.paddingTop },
              { key: 'paddingRight', name: 'Padding Right', value: layoutNode.paddingRight },
              { key: 'paddingBottom', name: 'Padding Bottom', value: layoutNode.paddingBottom },
              { key: 'paddingLeft', name: 'Padding Left', value: layoutNode.paddingLeft }
            ];
            
            paddings.forEach(padding => {
              if (padding.value > 0) {
                const hasPaddingVar = layoutNode.boundVariables && 
                                     layoutNode.boundVariables[padding.key as keyof typeof layoutNode.boundVariables] !== undefined;
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
                          unboundProperties.push({
              type: 'effect',
              property: node.effects.length > 1 ? `Effect ${index + 1} (${effect.type})` : `Effect (${effect.type})`,
              currentValue: safeText(effect.type),
              nodePath: safeText(currentPath),
              nodeId: node.id
            });
            }
          });
        }
      }

      // Fixed stroke weight checking - only check if there are visible strokes AND stroke weight > 0
      if ('strokeWeight' in node && typeof node.strokeWeight === 'number' && node.strokeWeight > 0) {
        // Also check if there are actually visible strokes applied
        const hasVisibleStrokes = 'strokes' in node && 
                                  node.strokes && 
                                  node.strokes.length > 0 && 
                                  node.strokes.some(stroke => stroke.visible !== false);
        
        if (hasVisibleStrokes) {
        const hasStrokeWeightVar = node.boundVariables && (
                                    node.boundVariables.strokeTopWeight !== undefined ||
                                    node.boundVariables.strokeBottomWeight !== undefined ||
                                    node.boundVariables.strokeLeftWeight !== undefined ||
                                    node.boundVariables.strokeRightWeight !== undefined
                                  );
        
        if (!hasStrokeWeightVar) {
          unboundProperties.push({
            type: 'stroke',
            property: 'Stroke Weight',
            currentValue: safeText(`${node.strokeWeight}px`),
            nodePath: safeText(currentPath),
            nodeId: node.id
            });
          }
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
    
    return components.map(component => {
      let componentSetName: string | undefined
      let variantProperties: Record<string, string> | undefined
      const displayName = (component.name || '').trim() || 'Unnamed Component'

      if (component.parent && component.parent.type === 'COMPONENT_SET') {
        const componentSet = component.parent as ComponentSetNode
        componentSetName = (componentSet.name || '').trim() || undefined
        
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

      return {
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
        isOnCurrentPage: safePageName === currentPageName
      }
    })
  }

  const processPageComponents = (page: PageNode): ComponentAuditData[] => {
    const components = page.findAll(node => node.type === 'COMPONENT') as ComponentNode[]
    const safePageName = (page.name || '').trim() || 'Unnamed Page'
    const currentPageName = (figma.currentPage.name || '').trim() || 'Current Page'
    
    return components.map(component => {
      let componentSetName: string | undefined
      let variantProperties: Record<string, string> | undefined
      let displayName = (component.name || '').trim() || 'Unnamed Component'

      if (component.parent && component.parent.type === 'COMPONENT_SET') {
        const componentSet = component.parent as ComponentSetNode
        componentSetName = (componentSet.name || '').trim() || undefined
        
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

      return {
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
        isOnCurrentPage: safePageName === currentPageName
      }
    })
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

  const getPageData = (): PageData[] => {
    const pageGroups = auditData.reduce((acc, component) => {
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
    console.log('togglePageExpansion:', { pageName, currentExpanded: expandedPages.includes(pageName) })
    
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
            <Text fontSize={12} fill="#69008C" fontWeight={600}>Add summary the canvas</Text>
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
          hoverStyle={{ fill: '#D8FFD1' }}
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

  const UnboundPropertiesDetail = ({ properties, componentId, isOnCurrentPage }: { 
    properties: UnboundProperty[], 
    componentId: string, 
    isOnCurrentPage: boolean 
  }) => {
    try {
      if (!properties || properties.length === 0) return null

    const groupedProperties = properties.reduce((acc, prop) => {
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
                      {safeNodePath !== 'N/A' && (
                        <Text 
                          fontSize={11} 
                          fontWeight={600} 
                          fill="#6A0000" 
                          width="fill-parent"
                        >
                          {safeNodePath}
                        </Text>
                      )}
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

const ComponentTable = ({ components, displayedCount }: { components: ComponentAuditData[], displayedCount: number }) => {
  console.log('ComponentTable render:', { componentsLength: components.length, displayedCount })
  
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
          
          console.log('Rendering component:', { 
            index, 
            componentId: safeComponent.id, 
            componentName: safeComponent.name, 
            isExpanded,
            hasUnboundProperties: safeComponent.hasUnboundProperties,
            unboundProperties: safeComponent.unboundProperties.length,
            componentSetName: safeComponent.componentSetName,
            variantProperties: safeComponent.variantProperties
          })
          
          try {            
                                console.log('Starting JSX render for component:', safeComponent.name)
            return (
            <AutoLayout key={safeComponent.id} direction="vertical" spacing={0} width="fill-parent">
              <AutoLayout
                direction="horizontal" 
                spacing={0} 
                padding={{ top: 8, right: 8, bottom: 8, left: 12 }} 
                fill={index % 2 === 0 ? "#FFFFFF" : "#FAFAFA"} 
                width="fill-parent"
                hoverStyle={{ fill: "#E3F2FD" }}
                verticalAlignItems="center"
              >
                <AutoLayout width={260} direction="horizontal" spacing={8} verticalAlignItems="center">
                  {safeComponent.hasUnboundProperties && (
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
                  )}
                  
                  <AutoLayout 
                    direction="vertical" 
                    spacing={2} 
                    width="fill-parent"
                    onClick={safeComponent.isOnCurrentPage ? () => navigateToComponent(safeComponent.id) : undefined}
                    hoverStyle={safeComponent.isOnCurrentPage ? { opacity: 0.8 } : undefined}
                  >
                    {safeComponent.componentSetName ? (
                      <>
                        <Text fontSize={11} fill={safeComponent.isOnCurrentPage ? "#1976D2" : "#000000"} fontWeight={600} width="fill-parent">
                          {safeText(safeComponent.componentSetName)}
                        </Text>
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
                        <Text fontSize={11} fill={safeComponent.isOnCurrentPage ? "#1976D2" : "#000000"} fontWeight={600} width={"fill-parent"}>
                          {safeText(safeComponent.name)}
                        </Text>
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
                    {safeComponent.hasUnboundProperties ? (
                      <XIcon />
                    ) : (
                      <CircleCheckIcon />
                    )}
                    {safeComponent.hasUnboundProperties && (
                      <Text fontSize={10} fill="#F44336" fontWeight={600}>
                        {safeText(safeComponent.unboundProperties.length)}
                      </Text>
                    )}
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
              
              {isExpanded && safeComponent.hasUnboundProperties && (
                <AutoLayout 
                  direction="vertical" 
                  spacing={0} 
                  padding={{ vertical: 0, horizontal: 12 }}
                  fill={index % 2 === 0 ? "#FFFFFF" : "#FAFAFA"}
                  width="fill-parent"
                >
                  {safeComponent.unboundProperties && safeComponent.unboundProperties.length > 0 ? (
                    <UnboundPropertiesDetail 
                      properties={safeComponent.unboundProperties} 
                      componentId={safeComponent.id}
                      isOnCurrentPage={safeComponent.isOnCurrentPage}
                    />
                  ) : (
                    <Text fontSize={11} fill="#666">No unbound properties found</Text>
                  )}
                </AutoLayout>
              )}
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
        hoverStyle={{ fill: "#F0F0F0" }}
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