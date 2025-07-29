const { widget } = figma
const { useSyncedState, useEffect, AutoLayout, Text, SVG, Rectangle } = widget

interface UnboundProperty {
  type: 'fill' | 'stroke' | 'text' | 'cornerRadius' | 'spacing' | 'effect' | 'strokeWeight'
  property: string
  currentValue?: string
  nodePath?: string
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
      const currentPath = path ? `${path} > ${node.name || node.type}` : node.name || node.type;

      if ('fills' in node && node.fills && node.fills !== figma.mixed) {
        const fills = node.fills as readonly Paint[];
        fills.forEach((fill, index) => {
          if (fill.type === 'SOLID') {
            const isBound = 'boundVariables' in fill && 
                           fill.boundVariables && 
                           fill.boundVariables.color !== undefined;
            
            const hasStyle = 'fillStyleId' in node && 
                           node.fillStyleId && 
                           node.fillStyleId !== '';
            
            if (!isBound && !hasStyle) {
              unboundProperties.push({
                type: 'fill',
                property: fills.length > 1 ? `Fill ${index + 1}` : 'Fill',
                currentValue: formatColor(fill.color),
                nodePath: currentPath
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
            const isBound = 'boundVariables' in stroke && 
                           stroke.boundVariables && 
                             stroke.boundVariables.color !== undefined;
            
            const hasStyle = 'strokeStyleId' in node && 
                           node.strokeStyleId && 
                             node.strokeStyleId !== '';
            
            if (!isBound && !hasStyle) {
              unboundProperties.push({
                type: 'stroke',
                  property: visibleStrokes.length > 1 ? `Stroke ${index + 1}` : 'Stroke',
                currentValue: formatColor(stroke.color),
                nodePath: currentPath
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
            unboundProperties.push({
              type: 'text',
              property: 'Font Family',
              currentValue: textNode.fontName !== figma.mixed ? `${textNode.fontName.family}` : 'Mixed',
              nodePath: currentPath
            });
          }
          
          if (!hasFontSizeVar) {
            unboundProperties.push({
              type: 'text',
              property: 'Font Size',
              currentValue: textNode.fontSize !== figma.mixed ? `${textNode.fontSize}px` : 'Mixed',
              nodePath: currentPath
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
            
            if (textNode.lineHeight.unit !== 'AUTO' && lineHeightValue !== '') {
              unboundProperties.push({
                type: 'text',
                property: 'Line Height',
                currentValue: lineHeightValue,
                nodePath: currentPath
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
              currentValue: `${node.cornerRadius}px`,
              nodePath: currentPath
            });
          }
        }
      }

      if (node.type === 'FRAME' || node.type === 'COMPONENT') {
        const layoutNode = node as FrameNode;
        
        if ('layoutMode' in layoutNode && layoutNode.layoutMode !== 'NONE') {
          if ('itemSpacing' in layoutNode && layoutNode.itemSpacing > 0) {
            const hasItemSpacingVar = layoutNode.boundVariables && 
                                     layoutNode.boundVariables.itemSpacing !== undefined;
            if (!hasItemSpacingVar) {
              unboundProperties.push({
                type: 'spacing',
                property: 'Item Spacing',
                currentValue: `${layoutNode.itemSpacing}px`,
                nodePath: currentPath
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
              if (padding.value > 0) {
                const hasPaddingVar = layoutNode.boundVariables && 
                                     layoutNode.boundVariables[padding.key as keyof typeof layoutNode.boundVariables] !== undefined;
                if (!hasPaddingVar) {
                  unboundProperties.push({
                    type: 'spacing',
                    property: padding.name,
                    currentValue: `${padding.value}px`,
                    nodePath: currentPath
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
                currentValue: effect.type,
                nodePath: currentPath
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
        const hasStrokeWeightVar = node.boundVariables && 
                                    node.boundVariables.strokeWeight !== undefined;
        
        if (!hasStrokeWeightVar) {
          unboundProperties.push({
            type: 'strokeWeight',
            property: 'Stroke Weight',
            currentValue: `${node.strokeWeight}px`,
            nodePath: currentPath
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
    
    return components.map(component => {
      let componentSetName: string | undefined
      let variantProperties: Record<string, string> | undefined

      if (component.parent && component.parent.type === 'COMPONENT_SET') {
        const componentSet = component.parent as ComponentSetNode
        componentSetName = componentSet.name
        
        const variantString = component.name
        const properties: Record<string, string> = {}
        
        const pairs = variantString.split(',').map(pair => pair.trim())
        pairs.forEach(pair => {
          const [key, value] = pair.split('=').map(part => part.trim())
          if (key && value) {
            properties[key] = value
          }
        })
        
        if (Object.keys(properties).length > 0) {
          variantProperties = properties
        }
      }

      return {
        id: component.id,
        name: component.name,
        componentSetName,
        variantProperties,
        pageName: page.name,
        hasDescription: hasDescription(component),
        hasDocumentationLink: hasDocumentationLink(component),
        hasUnboundProperties: false, // Skip for quick scan
        unboundProperties: [], // Skip for quick scan
        isHiddenFromPublishing: isHiddenFromPublishing(componentSetName || component.name),
        isOnCurrentPage: page.name === figma.currentPage.name
      }
    })
  }

  const processPageComponents = (page: PageNode): ComponentAuditData[] => {
    const components = page.findAll(node => node.type === 'COMPONENT') as ComponentNode[]
    
    return components.map(component => {
      let componentSetName: string | undefined
      let variantProperties: Record<string, string> | undefined
      let displayName = component.name

      if (component.parent && component.parent.type === 'COMPONENT_SET') {
        const componentSet = component.parent as ComponentSetNode
        componentSetName = componentSet.name
        
        const variantString = component.name
        const properties: Record<string, string> = {}
        
        const pairs = variantString.split(',').map(pair => pair.trim())
        pairs.forEach(pair => {
          const [key, value] = pair.split('=').map(part => part.trim())
          if (key && value) {
            properties[key] = value
          }
        })
        
        if (Object.keys(properties).length > 0) {
          variantProperties = properties
        }
      }

      const unboundCheck = checkForUnboundProperties(component)

      return {
        id: component.id,
        name: displayName,
        componentSetName,
        variantProperties,
        pageName: page.name,
        hasDescription: hasDescription(component),
        hasDocumentationLink: hasDocumentationLink(component),
        hasUnboundProperties: unboundCheck.hasUnbound,
        unboundProperties: unboundCheck.properties,
        isHiddenFromPublishing: isHiddenFromPublishing(componentSetName || component.name),
        isOnCurrentPage: page.name === figma.currentPage.name
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

  const runDeepScan = async () => {
    setIsDeepScanning(true)
    setAuditData([])
    setPageProgress([])
    setExpandedPages([])
    setExpandedComponents([])
    setPageDisplayCounts({})
    
    try {
      if (currentPageOnly) {
        setCurrentProgress('Deep scanning current page...')
        const currentPage = figma.currentPage
        
        setPageProgress([{
          name: currentPage.name,
          status: 'loading',
          componentCount: 0
        }])

        const pageComponents = processPageComponents(currentPage)
        
        setPageProgress([{
          name: currentPage.name,
          status: 'complete',
          componentCount: pageComponents.length
        }])

        setAuditData(pageComponents)
        setExpandedPages([currentPage.name])
        setPageDisplayCounts({ [currentPage.name]: CHUNK_SIZE })
              setCurrentProgress(`Deep scan complete: Found ${pageComponents.length} components`)
        
      } else {
      setCurrentProgress('Deep scanning all pages...')
        
        await figma.loadAllPagesAsync()
        const allPages = figma.root.children.filter(child => child.type === 'PAGE') as PageNode[]
        
        const initialProgress: PageProgress[] = allPages.map(page => ({
          name: page.name,
          status: 'pending',
          componentCount: 0
        }))
        setPageProgress(initialProgress)

        let allComponents: ComponentAuditData[] = []
        
        for (let i = 0; i < allPages.length; i++) {
          const page = allPages[i]
          
          try {
          setCurrentProgress(`Deep scanning page ${i + 1}/${allPages.length}: ${page.name}`)
            setPageProgress(prev => prev.map(p => 
              p.name === page.name 
                ? { ...p, status: 'loading' }
                : p
            ))

            const pageComponents = processPageComponents(page)
            allComponents = [...allComponents, ...pageComponents]
            
            setPageProgress(prev => prev.map(p => 
              p.name === page.name 
                ? { ...p, status: 'complete', componentCount: pageComponents.length }
                : p
            ))

            setAuditData([...allComponents])
            await new Promise(resolve => setTimeout(resolve, 200))
            
          } catch (error) {
            console.error(`Error processing page ${page.name}:`, error)
            setPageProgress(prev => prev.map(p => 
              p.name === page.name 
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

const navigateToComponent = async (componentId: string) => {
  try {
    if (!currentPageOnly) {
      await figma.loadAllPagesAsync()
    }
    const component = await figma.getNodeByIdAsync(componentId)
    if (component) {
      figma.viewport.scrollAndZoomIntoView([component])
    }
  } catch (error) {
    console.error('Error navigating to component:', error)
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

  const QuickScanResults = () => {
    if (!quickScanData) return null

    return (
      <AutoLayout direction="vertical" spacing={12} padding={12} fill="#FAECFF" cornerRadius={16} width="fill-parent">
        {/* <Text fontSize={12} fontWeight={700}>Quick Scan Results</Text> */}
        <AutoLayout direction="horizontal" spacing={4} width="fill-parent" wrap={true}>
          <Text fontSize={16} fill="#8C00BA">Out</Text>
          <Text fontSize={16} fill="#8C00BA">of</Text>
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{quickScanData.totalPages.toString()}</Text>
          <Text fontSize={16} fill="#8C00BA">pages,</Text>
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{quickScanData.pagesWithComponents.toString()}</Text>
          <Text fontSize={16} fill="#8C00BA">have</Text>
          <Text fontSize={16} fill="#8C00BA">components.</Text>
          <Text fontSize={16} fill="#8C00BA">We</Text>
          <Text fontSize={16} fill="#8C00BA">found</Text>
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{quickScanData.uniqueComponents.toString()}</Text>
          <Text fontSize={16} fill="#8C00BA">unique</Text>
          <Text fontSize={16} fill="#8C00BA">components</Text>
          <Text fontSize={16} fill="#8C00BA">and</Text>
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{quickScanData.totalVariants.toString()}</Text>
          <Text fontSize={16} fill="#8C00BA">total</Text>
          <Text fontSize={16} fill="#8C00BA">variants.</Text>
          
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{quickScanData.withoutDescription.toString()}/{quickScanData.totalVariants.toString()}</Text>
          <Text fontSize={16} fill="#8C00BA">components</Text>
          <Text fontSize={16} fill="#8C00BA">do</Text>
          <Text fontSize={16} fill="#8C00BA">not</Text>
          <Text fontSize={16} fill="#8C00BA">have</Text>
          <Text fontSize={16} fill="#8C00BA">a</Text>
          <Text fontSize={16} fill="#8C00BA">description</Text>
          <Text fontSize={16} fill="#8C00BA">set,</Text>
          <Text fontSize={16} fill="#8C00BA">and</Text>
          
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{quickScanData.withoutDocs.toString()}/{quickScanData.totalVariants.toString()}</Text>
          <Text fontSize={16} fill="#8C00BA">components</Text>
          <Text fontSize={16} fill="#8C00BA">do</Text>
          <Text fontSize={16} fill="#8C00BA">not</Text>
          <Text fontSize={16} fill="#8C00BA">have</Text>
          <Text fontSize={16} fill="#8C00BA">a</Text>
          <Text fontSize={16} fill="#8C00BA">documentation</Text>
          <Text fontSize={16} fill="#8C00BA">link.</Text>
          
          <Text fontSize={16} fontWeight={700} fill="#8C00BA">{quickScanData.hiddenComponents.toString()}</Text>
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
          
          <Text fontSize={11} fill="#8C00BA">
            {lastScanTime && `Scanned at ${lastScanTime}`}
          </Text>
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
          {currentProgress || 'Processing...'}
        </Text>
        </AutoLayout>
        
        {isProgressExpanded && (
          <AutoLayout direction="vertical" spacing={4} padding={{ left: 8, right: 12, bottom: 12 }} width="fill-parent">
        {pageProgress.length > 0 && (
              <>
            {pageProgress.map((page, index) => (
              <AutoLayout key={index} direction="horizontal" spacing={8} verticalAlignItems="center" width="fill-parent">
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
                      <Text fontSize={12} width={150} fill="#106A00">{page.name}</Text>
                    </AutoLayout>
                    <Text fontSize={12} fill="#106A00">
                  {page.status === 'complete' ? `${page.componentCount} components` : 
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

  const UnboundPropertiesDetail = ({ properties }: { properties: UnboundProperty[] }) => {
    try {
      if (!properties || properties.length === 0) return null

    const groupedProperties = properties.reduce((acc, prop) => {
      if (!acc[prop.type]) {
        acc[prop.type] = []
      }
      acc[prop.type].push(prop)
      return acc
    }, {} as Record<string, UnboundProperty[]>)

    const typeLabels = {
      fill: '🎨 Colors (Fill)',
      stroke: '🖊️ Colors (Stroke)', 
      text: '📝 Typography',
      cornerRadius: '📐 Corner Radius',
      spacing: '📏 Spacing',
      effect: '✨ Effects',
      strokeWeight: '📏 Stroke Weight'
    }

    return (
      <AutoLayout direction="vertical" spacing={12} width="fill-parent" padding={{ bottom: 12 }}>
        <Text fontSize={12} fontWeight={600} fill="#000">Properties without variables/styles</Text>
        
        {Object.keys(groupedProperties).map((type, typeIndex, typeArray) => (
          <AutoLayout key={type} direction="vertical" spacing={8} width="fill-parent">
            <Text fontSize={11} fontWeight={600} fill="#000">
              {typeLabels[type as keyof typeof typeLabels] || type}
            </Text>
            <AutoLayout direction="vertical" spacing={8} width="fill-parent">
            {groupedProperties[type].map((prop, index) => (
              <AutoLayout 
                key={index} 
                direction="vertical" 
                spacing={4} 
                  padding={{ top: 8, right: 16, bottom: 8, left: 16 }} 
                  fill="#FFF2F2" 
                  cornerRadius={8} 
                  stroke="#FFD6D6"
                width="fill-parent"
                >
                {prop.nodePath && (
                    <Text fontSize={11} fontWeight={600} fill="#6A0000">{prop.nodePath}</Text>
                )}
                  <AutoLayout direction="horizontal" spacing={8} width="fill-parent">
                    <Text fontSize={11} fill="#6A0000" width={160}>{prop.property}:</Text>
                    <Text fontSize={11} fill="#6A0000">{prop.currentValue || 'N/A'}</Text>
                  </AutoLayout>
              </AutoLayout>
            ))}
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
  
  // Use original components without grouping
  const visibleComponents = components.slice(0, displayedCount)
  const hasMore = components.length > displayedCount

  // Safety check - if too many components, show warning instead
  if (components.length > 100) {
  return (
      <AutoLayout direction="vertical" spacing={8} padding={12} fill="#FFF3CD" width="fill-parent">
        <Text fontSize={12} fill="#856404" fontWeight={600}>
          ⚠️ Too many components ({components.length})
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
          
          console.log('Rendering component:', { 
            index, 
            componentId: component.id, 
            componentName: component.name, 
            isExpanded,
            hasUnboundProperties: component.hasUnboundProperties,
            unboundPropertiesLength: component.unboundProperties?.length,
            componentSetName: component.componentSetName,
            variantProperties: component.variantProperties
          })
          
          try {
            // Validate component data before rendering
            if (!component || !component.id || !component.name) {
              throw new Error('Invalid component data')
            }
        
                                console.log('Starting JSX render for component:', component.name)
            return (
            <AutoLayout key={component.id} direction="vertical" spacing={0} width="fill-parent">
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
                  {component.hasUnboundProperties && (
                    <AutoLayout 
                      width={16} 
                      height={16} 
                      horizontalAlignItems="center" 
                      verticalAlignItems="center"
                      onClick={() => toggleComponentExpansion(component.id)}
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
                    onClick={() => navigateToComponent(component.id)}
                  >
                    {component.componentSetName ? (
                      <>
                        <Text fontSize={11} fill="#1976D2" fontWeight={600} width="fill-parent">
                          {component.componentSetName}
                        </Text>
                        {component.variantProperties && (
                          <AutoLayout direction="vertical" spacing={1}>
                            {Object.keys(component.variantProperties).map(key => (
                              <Text key={key} fontSize={10} fill="#333333">
                                {`${key}: ${component.variantProperties![key]}`}
                              </Text>
                            ))}
                          </AutoLayout>
                        )}
                        {component.isHiddenFromPublishing && (
                          <Text fontSize={9} fill="#222">Hidden from publishing</Text>
                        )}
                      </>
                    ) : (
                      <>
                        <Text fontSize={11} fill="#1976D2" fontWeight={600} width={"fill-parent"}>
                          {component.name}
                        </Text>
                        {component.isHiddenFromPublishing && (
                          <Text fontSize={9} fill="#222">Hidden from publishing</Text>
                        )}
                      </>
                    )}
                  </AutoLayout>
                </AutoLayout>
                
                <AutoLayout horizontalAlignItems="center" verticalAlignItems="center" height={24} width={70}>
                  {component.hasDescription ? (
                    <CircleCheckIcon />
                  ) : (
                    <XIcon />
                  )}
                </AutoLayout>
                
                <AutoLayout horizontalAlignItems="center" verticalAlignItems="center" height={24} width={70}>
                  {component.hasDocumentationLink ? (
                    <CircleCheckIcon />
                  ) : (
                    <XIcon />
                  )}
                </AutoLayout>
                
                <AutoLayout horizontalAlignItems="center" verticalAlignItems="center" height={24} width={70}>
                  <AutoLayout direction="horizontal" spacing={4} verticalAlignItems="center">
                    {component.hasUnboundProperties ? (
                      <XIcon />
                    ) : (
                      <CircleCheckIcon />
                    )}
                    {component.hasUnboundProperties && (
                      <Text fontSize={10} fill="#F44336" fontWeight={600}>
                        {component.unboundProperties.length}
                      </Text>
                    )}
                  </AutoLayout>
                </AutoLayout>
                
                {component.isOnCurrentPage && (
                  <AutoLayout 
                    horizontalAlignItems="center" 
                    verticalAlignItems="center" 
                    width={24}
                    height={24}
                    onClick={() => navigateToComponent(component.id)}
                    hoverStyle={{ fill: "#F0F0F0" }}
                    cornerRadius={16}
                  >
                    <ExternalLinkIcon size={12} />
                  </AutoLayout>
                )}
              </AutoLayout>
              
              {isExpanded && component.hasUnboundProperties && (
                <AutoLayout 
                  direction="vertical" 
                  spacing={0} 
                  padding={{ vertical: 0, horizontal: 12 }}
                  fill={index % 2 === 0 ? "#FFFFFF" : "#FAFAFA"}
                  width="fill-parent"
                >
                  {component.unboundProperties && component.unboundProperties.length > 0 ? (
                    <UnboundPropertiesDetail properties={component.unboundProperties} />
                  ) : (
                    <Text fontSize={11} fill="#666">No unbound properties found</Text>
                  )}
                </AutoLayout>
              )}
            </AutoLayout>
          )
          } catch (error) {
            console.error('Error rendering component:', component.id, error)
            return (
              <AutoLayout key={component.id} direction="vertical" spacing={4} padding={8} fill="#FFEBEE" cornerRadius={4} width="fill-parent">
                <Text fontSize={11} fill="#C62828">Error rendering component: {component.name}</Text>
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
    onClick={() => loadMoreComponents(components[0].pageName)}
            hoverStyle={{ fill: "#f0f0f0" }}
  >
            <Text fontSize={11} fill="#222" fontWeight={600}>
              {`Load more (${(components.length - displayedCount).toString()} remaining)`}
    </Text>
            <Text fontSize={11} fill="#222">
      {`Showing ${displayedCount.toString()} of ${components.length.toString()}`}
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
      componentSets.add(component.componentSetName)
    } else {
      regularComponents.add(component.name)
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
              {pageData.pageName}
            </Text>
          <AutoLayout direction="horizontal" spacing={12}>
              <Text fontSize={11} fill="#333333">
                {`${stats.total.toString()} ${stats.total === 1 ? 'variant' : 'variants'} (${stats.unique.toString()} ${stats.unique === 1 ? 'component' : 'components'})`}
            </Text>
            </AutoLayout>
            <AutoLayout direction="horizontal" spacing={12}>
              <Text fontSize={11} fill="#000" fontWeight={400}>{`Description: ${stats.withDescription.toString()}`}</Text>
              <Text fontSize={11} fill="#000" fontWeight={400}>{`Docs link: ${stats.withDocumentationLink.toString()}`}</Text>
              <Text fontSize={11} fill="#000" fontWeight={400}>{`Unbound values: ${stats.withUnboundProperties.toString()}`}</Text>
              <Text fontSize={11} fill="#000" fontWeight={400}>{`Hidden from publishing: ${stats.hidden.toString()}`}</Text>
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
          <Text fontSize={10} fill="#8C00BA">{`Load all (${totalCount.toString()}) (Figma may crash!)`}</Text>
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
            <Text fontSize={10} fill="#8C00BA">{`Reset to ${CHUNK_SIZE.toString()}`}</Text>
          </AutoLayout>
        )}
      </AutoLayout>
    )
  }



  return (
    <AutoLayout direction="vertical" spacing={16} padding={16} fill="#FFFFFF" cornerRadius={16} stroke="#eee" width={560} height="hug-contents">
      <AutoLayout direction="horizontal" spacing={12} width="fill-parent">
        <AutoLayout direction="vertical" spacing={4} width="fill-parent">
          <AutoLayout direction="horizontal" spacing={4} width="fill-parent" verticalAlignItems="center">
            <Text fontSize={12} fontWeight={700}>🔍</Text>
            <Text fontSize={16} fontWeight={700}>Component audit</Text>
          </AutoLayout>
          {!quickScanData && !isQuickScanning && (
            <Text fontSize={12} fill="#333" horizontalAlignText="center">
              Start with a quick scan to generate an overview of your components.
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

    {/* Quick Scan Section */}
    {!quickScanData && !isQuickScanning && (
      <AutoLayout direction="vertical" spacing={8} width="fill-parent">
        <AutoLayout 
          fill="#EFBEFF"
          cornerRadius={8} 
          padding={{ vertical: 6, horizontal: 10 }} 
          stroke="#E498FF"
          strokeWidth={1}
          onClick={runQuickScan}  // Changed from createSummaryFrame to runQuickScan
          hoverStyle={{ fill: "#FCF5FF", stroke: "#8C00BA" }}
          horizontalAlignItems="center"
          width="hug-contents"
        >
          <Text fontSize={12} fill="#69008C" fontWeight={600}>
            {isQuickScanning ? "Quick Scanning..." : "Quick Scan"}
          </Text>
        </AutoLayout>
      </AutoLayout>
    )}

      {/* Progress for quick scan */}
      {isQuickScanning && currentProgress && (
        <AutoLayout direction="vertical" spacing={8} padding={12} fill="#F0F8FF" cornerRadius={16} width="fill-parent">
          <Text fontSize={12} fontWeight={600}>{currentProgress}</Text>
        </AutoLayout>
      )}

      {/* Quick Scan Results */}
      <QuickScanResults />

      {/* Deep Scan Section */}
      {quickScanData && !isDeepScanning && auditData.length === 0 && (
        <>
          <AutoLayout direction="vertical" spacing={4} width="fill-parent">
            <Text fontSize={14} fontWeight={600}>Full analysis</Text>
            <Text fontSize={12} fill="#333333">
              Generate detailed information including unbound properties.
            </Text>
          </AutoLayout>

          <AutoLayout direction="vertical" cornerRadius={16} spacing={8} padding={12} fill="#FFF3CD" width="fill-parent">
              <Text fontSize={12} fill="#856404" fontWeight={600}>
                ⚠️ Performance Warning
              </Text>
              <Text fontSize={11} fill="#856404" width="fill-parent">
                If you have a lot of pages, analysing every page might crash Figma. It's recommended to do this on a page-by-page basis for best performance.
              </Text>
            </AutoLayout>          
          
          <AutoLayout direction="horizontal" spacing={8} verticalAlignItems="center" width="fill-parent">
            <AutoLayout direction="horizontal" verticalAlignItems="center" stroke="#eee" cornerRadius={16} padding={2}>
              <AutoLayout
                cornerRadius={16}
                fill={currentPageOnly ? "#FAECFF" : ""} 
                horizontalAlignItems="center"
                strokeWidth={1}
            padding={{ vertical: 6, horizontal: 8 }} 
          onClick={toggleScanScope}
        >
                <Text fontSize={11} fill={"#8C00BA"} >
                  Current page
                  </Text>
        </AutoLayout>
        <AutoLayout 
                cornerRadius={16} 
                fill={currentPageOnly ? "" : "#FAECFF"} 
                horizontalAlignItems="center"
          strokeWidth={1}
            padding={{ vertical: 6, horizontal: 8 }}
          onClick={toggleScanScope}
        >
                <Text fontSize={11} fill={"#8C00BA"}>
                  All pages
                  </Text>
        </AutoLayout>
      </AutoLayout>
  
            <AutoLayout 
              cornerRadius={8}
              fill="#EFBEFF"
              padding={{ vertical: 6, horizontal: 10 }} 
              stroke="#E498FF"
              strokeWidth={1}
              onClick={runDeepScan}
              hoverStyle={{ fill: "#FCF5FF", stroke: "#8C00BA" }}
              horizontalAlignItems="center"
            >
              <Text fontSize={12} fill="#69008C" fontWeight={600}>
                Deep scan ({currentPageOnly ? 'current page' : 'all pages'})
              </Text>
            </AutoLayout>
          </AutoLayout>
        </>
      )}

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
                  {`Scanned: ${lastScanTime} (${currentPageOnly ? 'current page' : 'all pages'})`}
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
      {getPageData().map((pageData, index) => (
        <AutoLayout key={pageData.pageName} direction="vertical" spacing={8} width="fill-parent">
          <PageAccordion pageData={pageData} />
          {pageData.isExpanded && (
            <LoadAllButton 
              pageName={pageData.pageName} 
              totalCount={pageData.components.length} 
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