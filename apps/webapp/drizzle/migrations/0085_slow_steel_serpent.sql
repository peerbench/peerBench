CREATE INDEX "responses_prompt_id_index" ON "responses" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "responses_model_id_index" ON "responses" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "responses_run_id_index" ON "responses" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "scores_prompt_id_index" ON "scores" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "scores_response_id_index" ON "scores" USING btree ("response_id");