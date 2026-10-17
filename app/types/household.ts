export type Household = {
  id: string;
  name: string | null;
  invite_code: string;
  base_ingredients: string[];
  todoist_api_token: string | null;
  todoist_project_id: string | null;
};
