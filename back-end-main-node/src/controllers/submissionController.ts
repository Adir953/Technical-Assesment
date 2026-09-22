import { Request, Response, NextFunction } from 'express';
import * as submissionService from '../services/submissionService';
import { parseId, parseLanguage, requireString } from '../utils/validation';

export async function listSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await submissionService.listByStudent(req.user!.id));
  } catch (error) {
    next(error);
  }
}

export async function startAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const assessmentId = parseId(req.body?.assessmentId, 'assessmentId');
    const submission = await submissionService.startAssessment(req.user!.id, assessmentId);
    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
}

export async function submitSolution(req: Request, res: Response, next: NextFunction) {
  try {
    const assessmentSubmissionId = parseId(req.params.id, 'id');
    const result = await submissionService.submitSolution({
      assessmentSubmissionId,
      studentId: req.user!.id,
      questionId: parseId(req.body?.questionId, 'questionId'),
      code: requireString(req.body?.code, 'code'),
      language: parseLanguage(req.body?.language),
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function completeAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'id');
    const submission = await submissionService.completeAssessment(id, req.user!.id);
    res.json(submission);
  } catch (error) {
    next(error);
  }
}

export async function getSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseId(req.params.id, 'id');
    const detail = await submissionService.getSubmissionDetail(id, req.user!.id);
    res.json(detail);
  } catch (error) {
    next(error);
  }
}
