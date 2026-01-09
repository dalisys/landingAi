import React from 'react';
import { AppStatus } from './types';
import { StepIndicator } from './components/StepIndicator';
import { PlanReview } from './components/PlanReview';
import { useApiKey } from './hooks/useApiKey';
import { useProjectFlow } from './hooks/useProjectFlow';
import { ApiKeyGate } from './views/ApiKeyGate';
import { AppHeader } from './views/AppHeader';
import { IdleView } from './views/IdleView';
import { StatusView } from './views/StatusView';
import { GeneratingView } from './views/GeneratingView';
import { CompletedView } from './views/CompletedView';

export default function App() {
  const displaySensitiveData = import.meta.env?.VITE_DISPLAY_DATA === 'true';
  const { hasApiKey } = useApiKey();
  const {
    status,
    viewStatus,
    totalCost,
    project,
    setViewStatus,
    addCost,
    handleStart,
    handleApprovePlan,
    handleGenerateCode,
    handleUpdateSectionImage,
    handleUpdateDesignSystem,
    handleUpdateSection,
    handleAddSection,
    handleDeleteSection,
    handleMoveSection,
    resetProject,
  } = useProjectFlow();

  if (!hasApiKey) {
    return <ApiKeyGate />;
  }

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <div className="fixed inset-0 grid-background opacity-60 pointer-events-none"></div>
      <div className="scan-lines fixed inset-0 pointer-events-none"></div>
      <div className="noise-overlay fixed inset-0 pointer-events-none"></div>

      <AppHeader displaySensitiveData={displaySensitiveData} totalCost={totalCost} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {status !== AppStatus.IDLE && (
          <StepIndicator
            status={status}
            viewStatus={viewStatus}
            onStepSelect={step => setViewStatus(step)}
            mode={project.generationMode}
          />
        )}

        <div className="mt-8 relative z-10">
          {viewStatus === AppStatus.IDLE && <IdleView onStart={handleStart} />}

          {viewStatus === AppStatus.EXTRACTING_DATA && (
            <StatusView status={viewStatus} displaySensitiveData={displaySensitiveData} />
          )}

          {viewStatus === AppStatus.ANALYZING && (
            <StatusView status={viewStatus} displaySensitiveData={displaySensitiveData} />
          )}

          {viewStatus === AppStatus.PLAN_REVIEW && (
            <PlanReview
              projectState={project}
              onApprove={handleApprovePlan}
              onUpdateDesignSystem={handleUpdateDesignSystem}
              onUpdateSection={handleUpdateSection}
              onAddSection={handleAddSection}
              onDeleteSection={handleDeleteSection}
              onMoveSection={handleMoveSection}
              mode={project.generationMode}
            />
          )}

          {(viewStatus === AppStatus.GENERATING_IMAGES ||
            (viewStatus === AppStatus.GENERATING_CODE &&
              project.sections.some(s => !s.generatedCode))) && (
            <GeneratingView
              status={status}
              project={project}
              displaySensitiveData={displaySensitiveData}
              onGenerateCode={handleGenerateCode}
              onUpdateSectionImage={handleUpdateSectionImage}
              onAddCost={addCost}
            />
          )}

          {viewStatus === AppStatus.RENDERING_PREVIEW && (
            <StatusView status={viewStatus} displaySensitiveData={displaySensitiveData} />
          )}

          {viewStatus === AppStatus.REVIEWING_CODE && (
            <StatusView status={viewStatus} displaySensitiveData={displaySensitiveData} />
          )}

          {viewStatus === AppStatus.APPLYING_FIXES && (
            <StatusView status={viewStatus} displaySensitiveData={displaySensitiveData} />
          )}

          {viewStatus === AppStatus.COMPLETED && (
            <CompletedView project={project} onReset={resetProject} />
          )}
        </div>
      </main>
    </div>
  );
}
