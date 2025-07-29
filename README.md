# 🔍 Figma Component Audit Widget

A powerful Figma widget designed to audit and analyze your design system components, helping you maintain consistency and identify potential issues in your component library.

## ✨ Features

### Quick Scan
- **Overview Analysis**: Get a high-level summary of your component library across all pages
- **Statistics Dashboard**: View total pages, unique components, variants, and missing metadata
- **Performance Optimized**: Fast scanning that won't crash Figma with large files

### Deep Analysis
- **Unbound Properties Detection**: Identify components with hardcoded values instead of design tokens
- **Metadata Validation**: Check for missing descriptions and documentation links
- **Component Navigation**: Click to jump directly to any component in your file
- **Publishing Status**: Identify components hidden from publishing (prefixed with `.` or `_`)

### Smart UI/UX
- **Progressive Loading**: Load components in chunks to prevent crashes
- **Collapsible Results**: Expand/collapse pages and individual components
- **Visual Indicators**: Color-coded status icons for quick assessment
- **Summary Frame Export**: Generate a styled summary frame on your canvas

## 🚀 To run this widget locally in your organisation:

### Prerequisites
- [Node.js](https://nodejs.org/en/download/) (comes with npm)
- [Visual Studio Code](https://code.visualstudio.com/) (recommended)

### Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/louriach/Figma-Widget-Design-system-audit.git
   cd Figma-Widget-Design-system-audit
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development build:
   ```bash
   npm run watch
   ```

4. In Figma:
   - Go to **Plugins > Development > Import plugin from manifest**
   - Select the `manifest.json` file from this project

## 📖 Usage

### Quick Scan
1. Open the widget in Figma
2. Click **"Quick Scan"** to analyze your entire file
3. Review the summary statistics and component overview
4. Optionally click **"Add summary to canvas"** to create a visual report

### Deep Analysis
1. After running a quick scan, choose your scope:
   - **Current page**: Analyze only the active page (recommended for large files)
   - **All pages**: Analyze the entire file (may be slow for large files)
2. Click **"Deep scan"** to perform detailed analysis
3. Expand pages to see individual components
4. Click the expand icon (▶️) next to components with issues to see details
5. Use the navigation icon (🔗) to jump to components on the current page

### Understanding Results

#### Component Status Indicators
- ✅ **Green Check**: Component meets best practices
- ❌ **Red X**: Component has issues that need attention
- 🔗 **Link Icon**: Click to navigate to component (only shown for current page)

#### Unbound Properties
The widget detects components with hardcoded values instead of design tokens:
- **Colors**: Fill and stroke colors without variables or styles
- **Typography**: Font family, size, and line height without variables
- **Spacing**: Padding and item spacing without variables
- **Effects**: Drop shadows and other effects without styles
- **Corner Radius**: Border radius without variables
- **Stroke Weight**: Stroke width without variables

## 🛠️ Technical Details

### Architecture
- **TypeScript**: Full type safety and better development experience
- **React-like JSX**: Familiar component-based UI development
- **Figma Widget API**: Native integration with Figma's design tools
- **Progressive Loading**: Chunked rendering to handle large component sets

### Performance Optimizations
- **Chunked Loading**: Components load in groups of 5 to prevent crashes
- **Conditional Rendering**: Navigation icons only show for current page
- **Error Boundaries**: Graceful handling of rendering errors
- **Safety Limits**: Warning for pages with >100 components

### Data Structure
```typescript
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
```

## 🎯 Best Practices

### For Design Systems
1. **Use Design Tokens**: Replace hardcoded values with variables
2. **Add Descriptions**: Document component purpose and usage
3. **Include Documentation**: Link to design system documentation
4. **Consistent Naming**: Use clear, descriptive component names
5. **Publishing Strategy**: Hide internal components with `.` or `_` prefix

### For Large Files
1. **Page-by-Page Analysis**: Use "Current page" mode for better performance
2. **Regular Audits**: Run scans periodically to catch issues early
3. **Team Coordination**: Share audit results with your design team

## 🔧 Development

### Building
```bash
# Development mode (watches for changes)
npm run watch

# Production build
npm run build
```

### Project Structure
```
├── manifest.json          # Widget configuration
├── package.json           # Dependencies and scripts
├── widget-src/
│   ├── code.tsx          # Main widget code
│   └── tsconfig.json     # TypeScript configuration
├── dist/                 # Compiled JavaScript (auto-generated)
└── README.md            # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/feature-name`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature/feature-name`
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with the [Figma Widget API](https://www.figma.com/widget-docs/)
- Inspired by the need for better design system auditing tools
- Thanks to the Figma community for feedback and suggestions

---

**Happy auditing 🎉**
