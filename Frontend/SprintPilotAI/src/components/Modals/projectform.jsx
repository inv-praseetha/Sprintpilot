import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import BasicDetailsSection from './ProjectFormSections/BasicDetailsSection';
import ScheduleSection from './ProjectFormSections/ScheduleSection';
import TeamSelectionSection from './ProjectFormSections/TeamSelectionSection';

export default function ProjectForm({
  handleSubmit,
  formError,
  calculateEndDate,
  darkMode,
  projectId,
  setProjectId,
  jiraId,
  setJiraId,
  name,
  setName,
  description,
  setDescription,
  type,
  setType,
  status,
  setStatus,
  teamSize,
  setTeamSize,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  numberOfDays,
  setNumberOfDays,
  teamLead,
  setTeamLead,
  teamLeads,
  skillCategoryFilter,
  setSkillCategoryFilter,
  filteredSkills,
  selectedSkills,
  toggleSkillSelection,
  filteredEmployeesForSelection,
  employees,
  selectedMembers,
  toggleMemberSelection,
  onClose,
  submitting,
  editingProjectId
}) {
  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Form Feedback */}
      {formError && (
        <div className="flex gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <BasicDetailsSection
        darkMode={darkMode}
        projectId={projectId}
        setProjectId={setProjectId}
        editingProjectId={editingProjectId}
        jiraId={jiraId}
        setJiraId={setJiraId}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        type={type}
        setType={setType}
        status={status}
        setStatus={setStatus}
        teamSize={teamSize}
        setTeamSize={setTeamSize}
      />

      <ScheduleSection
        type={type}
        darkMode={darkMode}
        editingProjectId={editingProjectId}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        numberOfDays={numberOfDays}
        setNumberOfDays={setNumberOfDays}
        calculateEndDate={calculateEndDate}
      />

      <TeamSelectionSection
        darkMode={darkMode}
        editingProjectId={editingProjectId}
        teamLead={teamLead}
        setTeamLead={setTeamLead}
        teamLeads={teamLeads}
        skillCategoryFilter={skillCategoryFilter}
        setSkillCategoryFilter={setSkillCategoryFilter}
        filteredSkills={filteredSkills}
        selectedSkills={selectedSkills}
        toggleSkillSelection={toggleSkillSelection}
        filteredEmployeesForSelection={filteredEmployeesForSelection}
        employees={employees}
        selectedMembers={selectedMembers}
        toggleMemberSelection={toggleMemberSelection}
        teamSize={teamSize}
      />

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className={`px-5.5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${darkMode
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold'
            }`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-6.5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/20 cursor-pointer animate-fade-in"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{editingProjectId ? 'Save Changes' : 'Create Project'}</span>
        </button>
      </div>

    </form>
  );
}
