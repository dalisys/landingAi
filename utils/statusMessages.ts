import { AppStatus } from '../types';

export const getStatusMessage = (currentStatus: AppStatus, displayData: boolean) => {
  switch (currentStatus) {
    case AppStatus.EXTRACTING_DATA:
      return {
        title: 'Extracting Website Data...',
        subtitle: displayData
          ? 'Analyzing all content, features, and structure'
          : 'Analyzing website content and structure',
      };
    case AppStatus.ANALYZING:
      return {
        title: 'Creating Redesign Plan...',
        subtitle: displayData
          ? 'Using extracted data to design a better user experience'
          : 'Designing a better user experience',
      };
    case AppStatus.GENERATING_IMAGES:
      return {
        title: 'Generating Visual Assets',
        subtitle: displayData
          ? 'Creating high-fidelity mockups for each section...'
          : 'Creating high-fidelity mockups for each section...',
      };
    case AppStatus.GENERATING_CODE:
      return {
        title: 'Generating Code',
        subtitle: displayData
          ? 'Compiling production-ready HTML for each section...'
          : 'Compiling production-ready HTML for each section...',
      };
    case AppStatus.RENDERING_PREVIEW:
      return {
        title: 'Rendering UI Preview...',
        subtitle: displayData
          ? 'Capturing screenshots of generated sections'
          : 'Capturing preview images',
      };
    case AppStatus.REVIEWING_CODE:
      return {
        title: 'Reviewing Design...',
        subtitle: displayData
          ? 'AI is analyzing design quality and requirements match'
          : 'Ensuring quality and adherence to requirements',
      };
    case AppStatus.APPLYING_FIXES:
      return {
        title: 'Applying Adjustments...',
        subtitle: displayData
          ? 'Implementing suggested improvements'
          : 'Refining the design based on feedback',
      };
    default:
      return { title: '', subtitle: '' };
  }
};
